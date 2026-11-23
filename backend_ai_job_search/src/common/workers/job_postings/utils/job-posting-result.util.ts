/**
 * Result shape of the `job_posting_processing` task. Kept in `utils/` so the
 * worker only orchestrates the duplicate check and the inserts.
 */

/** Job keys split into newly stored postings and already seen ones. */
export type JobPostingProcessingResult = {
  new_vacs_job_keys: string[];
  dub_vacs_job_keys: string[];
};

/** Returns a fresh, empty result for one processing run. */
export function createJobPostingResult(): JobPostingProcessingResult {
  return {
    new_vacs_job_keys: [],
    dub_vacs_job_keys: [],
  };
}
