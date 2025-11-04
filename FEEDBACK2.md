# Phase 3 – Step 2 Review (Confidence Scoring, Follow-up)

Great progress: the deferred reinforcers/penalties are now documented, and `mergeFactSets` keeps `Source` types valid. One last gap remains before we can freeze the API:

- **Medium — KB docs still expose private helpers** (`src/kb/spec.md:268-330`)  
  The regenerated spec continues to list `computeBaseEvidence`, `computeReinforcers`, `computePenalties`, `mergeFactSets`, etc. as public exports even though the implementation marks them `private/@internal`. Please re-run the doc generator (or update the generator filters) so these helpers disappear from the published API. Consumers rely on the spec as the contract, so we need it to reflect just the public surface (`getConfidenceScore`, `scoreConfidence`, `scoreToConfidenceBand`, etc.).

Once the spec matches the actual visibility, Step 2 will be ready to hand over to Agent 2. !*** End Patch**
