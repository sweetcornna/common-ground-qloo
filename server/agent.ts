import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { Candidate, Entity, EntityType, PlanRequest, PlanResponse, TraceEvent } from '../src/shared.js';
import type { Provider } from './provider.js';
import { aborted } from './governor.js';
import { ServiceError } from './provider.js';
const domains: EntityType[] = ['artist', 'movie', 'book'];
type Lists = Record<EntityType, [Entity[], Entity[]]>;
const State = Annotation.Root({
  request: Annotation<PlanRequest>(),
  signal: Annotation<AbortSignal | undefined>(),
  lists: Annotation<Lists>(),
  ranked: Annotation<Record<EntityType, Candidate[]>>(),
  trace: Annotation<TraceEvent[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  response: Annotation<PlanResponse>(),
});
export function rankCandidates(lists: [Entity[], Entity[]], excluded: Set<string>, adventurous: boolean): Candidate[] {
  const entities = new Map(lists.flat().map(e => [e.id, e]));
  return [...entities.values()].filter(e => !excluded.has(e.id)).map(entity => {
    const ranks = lists.map(list => { const index = list.findIndex(e => e.id === entity.id); return index < 0 ? null : index + 1; }) as [number | null, number | null];
    const rankScores = ranks.map((rank, i) => rank === null ? 0 : (lists[i].length - rank + 1) / lists[i].length) as [number, number];
    const minimum = Math.min(...rankScores);
    const average = (rankScores[0] + rankScores[1]) / 2;
    const fairnessScore = (adventurous ? .45 : .8) * minimum + (adventurous ? .55 : .2) * average;
    const reason = ranks.every(r => r !== null)
      ? `Appears at #${ranks[0]} for person A and #${ranks[1]} for person B in the current returned recommendation lists for this category. ${adventurous ? 'This mix allows more one-sided discoveries.' : 'The weaker of the two ranks receives most of the weight.'}`
      : `Appears only in person ${ranks[0] === null ? 'B' : 'A'}’s current returned recommendation list. The other person’s fit is unknown; their rank contribution is conservatively zero.`;
    return { ...entity, ranks, rankScores, fairnessScore, reason };
  }).sort((a, b) => b.fairnessScore - a.fairnessScore || a.id.localeCompare(b.id));
}
export function createPlanner(provider: Provider) {
  const graph = new StateGraph(State)
    .addNode('retrieve', async state => {
      aborted(state.signal);
      const lists = {} as Lists;
      const excludeIds = [...new Set([...state.request.excludeIds, ...state.request.profiles.flatMap(p => p.seeds.map(s => s.id))])];
      // At most two provider requests at once; each profile keeps its own ranking.
      for (const type of domains) {
        aborted(state.signal);
        lists[type] = await Promise.all(state.request.profiles.map(p => provider.recommend(p.seeds, type, { signal: state.signal, excludeIds }))) as [Entity[], Entity[]];
      }
      return { lists, trace: [{ node: 'retrieve', detail: `Retrieved two independent rankings in each of three categories using ${state.request.mode === 'demo' ? 'curated demo fixtures' : 'Qloo insights'}.` }] };
    })
    .addNode('negotiate', state => {
      aborted(state.signal);
      const excluded = new Set([...state.request.excludeIds, ...state.request.profiles.flatMap(p => p.seeds.map(s => s.id))]);
      const ranked = {} as Record<EntityType, Candidate[]>;
      for (const type of domains) ranked[type] = rankCandidates(state.lists[type], excluded, state.request.focus === 'adventurous');
      return { ranked, trace: [{ node: 'negotiate', detail: `Merged by entity ID, excluded ${excluded.size} selected or rejected IDs, and ranked with ${state.request.focus === 'balanced' ? '80% weaker-rank + 20% average-rank' : '45% weaker-rank + 55% average-rank'} weighting.` }] };
    })
    .addNode('compose', state => {
      const active = domains.filter(type => state.ranked[type].length > 0);
      if (!active.length) throw new ServiceError('NO_CANDIDATES', 'No new candidates remain. Try different seeds or clear skipped suggestions.', 422);
      const baseMinutes = Math.floor(state.request.minutes / active.length);
      const steps = active.map((type, index) => ({
        entity: state.ranked[type][0], minutes: baseMinutes + (index === active.length - 1 ? state.request.minutes % active.length : 0),
        activity: type === 'artist' ? 'Listen to a few tracks together' : type === 'movie' ? 'Watch a trailer or a short available excerpt' : 'Read a synopsis or a legally available sample',
        prompt: type === 'artist' ? 'Which sound feels familiar to each of you? Where do your reactions split?' : type === 'movie' ? 'Choose one frame or mood you both want to explore. What would you watch next?' : 'Each pick one idea that caught your attention. How does it connect to something you already love?',
        alternatives: state.ranked[type].slice(1, 4),
      }));
      const warnings = state.request.mode === 'demo' ? ['Offline fixture rankings are synthetic and do not represent Qloo predictions.'] : [];
      if (steps.some(step => step.entity.ranks.some(rank => rank === null))) warnings.push('At least one pick has no shared candidate evidence in the returned lists. It is a one-sided discovery; the other person’s fit is unknown.');
      if (active.length < domains.length) warnings.push('Some categories returned no eligible candidates; sampling time was redistributed.');
      return { response: { mode: state.request.mode, source: state.request.mode === 'demo' ? 'curated-demo' : 'qloo-live', steps, totalMinutes: state.request.minutes, trace: [], warnings, methodology: 'Live ranks refer to exclusion-filtered returned candidate windows. Ranks can change after feedback and are not comparable across runs. Scores are local rank-based negotiation scores, not Qloo affinity probabilities. Missing ranks mean unknown fit. Minutes are chosen sampling budgets, not work runtimes. No availability or licensing is verified.' } as PlanResponse,
        trace: [{ node: 'compose', detail: `Allocated exactly ${state.request.minutes} minutes across ${steps.length} sampling activities and retained up to three alternatives per activity.` }] };
    })
    .addNode('verify', state => {
      const response = state.response;
      const ids = response.steps.map(s => s.entity.id);
      if (new Set(ids).size !== ids.length || response.steps.reduce((sum, s) => sum + s.minutes, 0) !== state.request.minutes || ids.some(id => state.request.excludeIds.includes(id))) throw new ServiceError('PLAN_VALIDATION', 'The plan did not pass its constraints. Please retry.');
      return { trace: [{ node: 'verify', detail: 'Verified distinct picks, exclusions, and the exact requested time budget. Ready for feedback and replanning.' }] };
    })
    .addEdge(START, 'retrieve').addEdge('retrieve', 'negotiate').addEdge('negotiate', 'compose').addEdge('compose', 'verify').addEdge('verify', END).compile();
  return async (request: PlanRequest, signal?: AbortSignal): Promise<PlanResponse> => {
    aborted(signal);
    const controller = new AbortController();
    const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      const result = await graph.invoke({ request, signal: combinedSignal }, { recursionLimit: 8, signal: combinedSignal });
      aborted(combinedSignal);
      return { ...result.response, trace: result.trace };
    } finally { controller.abort(); }
  };
}
