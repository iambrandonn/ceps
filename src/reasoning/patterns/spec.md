# src/reasoning/patterns

**Directory Overview:** This directory contains 6 entities.

## pattern-registry.ts

<a id="qzrItKqOH9"></a>

### PatternRegistry

**Visibility:** Public (exported)

**Behavior:**

- Class PatternRegistry (intent unclear from static analysis)

**Open Questions:**
- q:UWBGed3TJs: What are the responsibilities and contract of class `PatternRegistry` at src/reasoning/patterns/pattern-registry.ts?

<a id="x0wGhynbxw"></a>

### register

**Signature:** `(pattern: PatternModule): void`

**Visibility:** Public (exported)

**Behavior:**

- Method register (intent unclear from static analysis)

**Errors thrown:**
- new PatternRegistrationError(pattern.id || '(empty)', 'Invalid ID: must be non-empty string');
- new PatternRegistrationError(pattern.id, 'Pattern already registered');
- new PatternRegistrationError(pattern.id, 'Missing required method: matches()');
- new PatternRegistrationError(pattern.id, 'Missing required method: describe()');
- new PatternRegistrationError(pattern.id, 'Invalid priority: must be PatternPriority enum value');

<a id="TisZPlCRkE"></a>

### match

**Signature:** `(kb: KnowledgeBase, entity: Entity): any`

**Visibility:** Public (exported)

**Behavior:**

- Method match (intent unclear from static analysis)

**Open Questions:**
- q:jCmorQOy8l: What is the behavior of method `match` at src/reasoning/patterns/pattern-registry.ts?

<a id="ScsMaHXXKc"></a>

### describe

**Signature:** `(kb: KnowledgeBase, entity: Entity): import("/src/kb/models").BehaviorChunk[]`

**Visibility:** Public (exported)

**Behavior:**

- Method describe (intent unclear from static analysis)

**Open Questions:**
- q:rgRLs1whcq: What is the behavior of method `describe` at src/reasoning/patterns/pattern-registry.ts?

<a id="rDTnAHZ2CK"></a>

### getConfidenceAdjustments

**Signature:** `(kb: KnowledgeBase, entity: Entity): any`

**Visibility:** Public (exported)

**Behavior:**

- Method getConfidenceAdjustments: Retrieves data or value

**Open Questions:**
- q:6lkhGR8C2Z: What is the behavior of method `getConfidenceAdjustments` at src/reasoning/patterns/pattern-registry.ts?

## types.ts

<a id="HL2XhtNzzB"></a>

### PatternRegistrationError

**Visibility:** Public (exported)

**Behavior:**

- Class PatternRegistrationError: 
Registration error thrown when pattern module violates contract.

**Open Questions:**
- q:E3HQ62ZyXY: What are the responsibilities and contract of class `PatternRegistrationError` at src/reasoning/patterns/types.ts?

