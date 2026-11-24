// Proof reads each repo's newest Fitness suite run and judges every promise by it.
// It touches no DOM, so the page and the tests share it unchanged.

import { API, ERROR, gate, ORG } from './journey.js';

// The org's suite runs every repo's tests on its pull requests.
export const SUITE = 'Fitness suite';
export const DAYS = 7;
const WINDOW = DAYS * 24 * 3600 * 1000;
// Rows the unproven table shows before List all.
export const LIST = 10;
export const STATUS = {
  failed: 'failed',
  noTest: 'no-test',
  notRun: 'not-run',
  proven: 'proven',
  skipped: 'skipped',
};
// Statuses that turn a link red; a promise not run lately is unknown, not broken.
export const UNPROVEN = new Set([STATUS.failed, STATUS.noTest, STATUS.skipped]);
// What the page counts, in bar order; the names double as its CSS classes.
export const BUCKET = { notRun: STATUS.notRun, proven: STATUS.proven, unproven: 'unproven' };
export const BAR = [BUCKET.proven, BUCKET.unproven, BUCKET.notRun];
// Run conclusions, and the annotation level, that GitHub reports.
export const CONCLUSION = { failure: 'failure', success: 'success' };
export const LABELS = {
  [STATUS.failed]: 'Failed',
  [STATUS.noTest]: 'No test',
  [STATUS.notRun]: 'Not run',
  [STATUS.proven]: 'Proven',
  [STATUS.skipped]: 'Skipped',
};
// The red of an unproven link in each color scheme, matching the page's --error.
export const RED = { dark: '#ff8a7a', light: '#b42318' };

const RAN = new Set(Object.values(CONCLUSION));
const STEP = /^Run fitness/;
const NO_RUN = `no ${SUITE} run in ${DAYS} days`;

/**
 * Matches an acceptance ID as a doc writes it (0002.10) or a test names it (test0002_10).
 */
export function idPattern(id) {
  const [doc, number] = id.split('.');
  return new RegExp(`(?<![\\d.])${doc}[._]${number}(?!\\d)`);
}

/**
 * The status an annotation naming a promise gives it.
 */
export function classify(text) {
  if (/skip/i.test(text)) return STATUS.skipped;
  if (/\bno test\b|\buntested\b|\bmissing (?:a )?test\b/i.test(text)) return STATUS.noTest;
  return STATUS.failed;
}

/**
 * Reads one repo's newest Fitness suite run from the last week: whether its
 * tests ran, and the annotations its jobs left. Null when there is none.
 */
async function readRun(get, name) {
  const listed = await get(
    `${API}/repos/${ORG}/${name}/actions/runs?event=pull_request&status=completed&per_page=100`,
    true
  );
  const since = Date.now() - WINDOW;
  const run = listed?.workflow_runs.find((r) => r.name === SUITE && Date.parse(r.created_at) >= since);
  if (!run) return null;
  const { jobs } = await get(run.jobs_url);
  const stepRan = jobs.some((job) => job.steps.some((step) => STEP.test(step.name) && RAN.has(step.conclusion)));
  const notes = await Promise.all(jobs.map((job) => get(`${job.check_run_url}/annotations`)));
  const annotations = notes
    .flat()
    .filter((a) => a.annotation_level === CONCLUSION.failure || classify(a.message) === STATUS.skipped)
    .map((a) => a.message);
  return {
    annotations,
    at: run.created_at,
    ran: run.conclusion === CONCLUSION.success || (run.conclusion === CONCLUSION.failure && stepRan),
    url: run.html_url,
  };
}

/**
 * Reads the newest Fitness suite run of each named repo, `limit` calls at a
 * time. A bad token or rate limit stops it; any other failure stays with its repo.
 */
export async function fetchProof({ get, limit, repos }) {
  const { halt, run } = gate(limit);
  const limited = (url, allow404 = false) => run(() => get(url, allow404));
  const entries = await Promise.all(
    repos.map(async (name) => {
      try {
        return [name, await readRun(limited, name)];
      } catch (error) {
        const failure = error;
        if (failure.kind === ERROR.TOKEN || failure.kind === ERROR.RATE) {
          halt(failure);
          throw failure;
        }
        return [name, { error: failure.message }];
      }
    })
  );
  return new Map(entries.filter(([, proof]) => proof));
}

/**
 * Judges one promise by its repo's run: its status, why, and the run's link.
 */
export function judge({ id }, proof) {
  if (!proof) return { detail: NO_RUN, status: STATUS.notRun };
  if (proof.error) return { detail: `its runs are unreadable: ${proof.error}`, status: STATUS.notRun };
  if (!proof.ran) return { detail: 'the newest run stopped before its tests', status: STATUS.notRun, url: proof.url };
  const pattern = idPattern(id);
  const note = proof.annotations.find((text) => pattern.test(text));
  if (!note)
    return {
      detail: `passed in the run of ${new Date(proof.at).toDateString()}`,
      status: STATUS.proven,
      url: proof.url,
    };
  return { detail: note, status: classify(note), url: proof.url };
}

/**
 * The bucket a status counts in: proven, unproven or not run.
 */
export function bucketOf(status) {
  if (UNPROVEN.has(status)) return BUCKET.unproven;
  return status === STATUS.proven ? BUCKET.proven : BUCKET.notRun;
}

/**
 * Counts promises per bucket, by repo and in total.
 */
export function tally(promises) {
  const blank = () => ({ [BUCKET.notRun]: 0, [BUCKET.proven]: 0, [BUCKET.unproven]: 0, total: 0 });
  const total = blank();
  const repos = new Map();
  for (const promise of promises) {
    const counts = repos.get(promise.repo) ?? blank();
    repos.set(promise.repo, counts);
    const key = bucketOf(promise.proof.status);
    for (const c of [counts, total]) {
      c[key] += 1;
      c.total += 1;
    }
  }
  return { repos, total };
}
