# Problem Statement - TrustLens

## 1. Current Problem
In the modern business landscape, Large Language Models (LLMs) and other generative AI tools have become vital for productivity, data analysis, and report generation. However, security-conscious organizations and professionals are faced with a severe dilemma: sharing documents with external AI systems risks leaking sensitive data, violating privacy laws (such as GDPR, CCPA, and HIPAA), or breaching intellectual property contracts. 

To mitigate these risks, users rely on automated data anonymization and PII (Personally Identifiable Information) redactors. Unfortunately, these redactors operate as "black boxes." When a document is processed, the system outputs a redacted version without explaining *why* specific information was hidden or, more critically, *why other pieces of information were left visible*. Because these tools lack transparency, users cannot trust them and must manually review every single word of the output. This renders the automated speed-up obsolete.

## 2. User Pain Points
* **Cognitive Load & Verification Fatigue**: Compliance officers and analysts are forced to cross-reference every redacted document against the original, word-by-word, to ensure the AI did not miss any sensitive information.
* **Severe Liability Risks**: If an automated tool makes a mistake (a false negative) and leaves an email address, SSN, or proprietary client name in the document, the user and their organization face massive regulatory fines, lawsuit liabilities, and reputational damage.
* **Loss of Context**: Over-redaction (false positives) is equally frustrating. Black-box tools often hide crucial context (such as timestamps, generic financial amounts, or product names) that the downstream LLM needs to perform the requested analysis, rendering the final AI output useless.
* **Impeded AI Adoption**: Professionals are prohibited by legal and compliance departments from using AI assistants altogether, because there is no transparent mechanism to audit what is being sent out.

## 3. Existing Solutions
Several PII detection and redaction tools are currently available:
* **Regular Expression (Regex) Matchers**: Simple tools that scan for pre-defined formats (e.g., `\d{3}-\d{2}-\d{4}` for SSNs).
* **Named Entity Recognition (NER) Models**: Machine learning models (e.g., standard SpaCy or Presidio components) that predict entity classes like PERSON, ORG, or GPE.
* **Standard SaaS Anonymizers**: Commercial cloud tools that allow drag-and-drop file redaction before sending the text to third-party endpoints.

## 4. Why They Fail
* **Contextual Blindness**: Rules-based regex matchers fail to catch unstructured PII (such as a paragraph describing an identity) and create high false-positives for numbers that are just quantities, not SSNs or credit cards.
* **No Explanation Capability**: Standard machine learning models only output a label (e.g., `PERSON`) and a probability score. They cannot explain *why* they flagged a word, making it impossible for the user to quickly verify the correctness of a borderline decision.
* **Lack of Visual/Audit Trails**: Most tools act as simple file processors. They do not provide a visual workspace to review logic, toggle redaction statuses, and export a clear, signed compliance audit trail ("Safe-to-Share Report") that senior management or compliance teams require.

## 5. Our Solution: TrustLens
TrustLens solves the trust gap by establishing **Trust & Explainability** as first-class citizens. 

Rather than expecting users to blindly accept redaction decisions, TrustLens proves that the document is safe:
* **Dual-Explanation System**: We highlight and explain both sides of the coin: why flagged text is redacted (e.g., "Flagged as Name: matching credit card owner signature context") and why surrounding questionable text was left visible (e.g., "Left visible: context indicates this is a generic software product name, not a person").
* **Verifiable Confidence Scores**: Every classification is accompanied by a transparent confidence score, derived from token-level weights and context matchers, indicating how sure the AI engine is of its decision.
* **Interactive Validation Studio**: A side-by-side, split-screen UI where users can hover over any word to inspect its explanation log, edit the classification, override the decision, and instantly see the downstream safety score update.
* **Cryptographic Safe-to-Share Report**: Upon completion, the system generates a verifiable, structured report proving that the document has been fully checked and is free of compliance risks, ready to be safely shared with external AI systems.
