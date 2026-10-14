# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class VeritasMarket(gl.Contract):
    question: str
    criteria: str
    evidence_url: str
    has_resolved: bool
    outcome: str
    resolution_reason: str
    yes_pool: u256
    no_pool: u256

    def __init__(self, question: str, criteria: str, evidence_url: str):
        self.question = question
        self.criteria = criteria
        self.evidence_url = evidence_url
        self.has_resolved = False
        self.outcome = "UNRESOLVED"
        self.resolution_reason = ""
        self.yes_pool = u256(12500)
        self.no_pool = u256(3100)

    @gl.public.write
    def bet(self, side: str, amount: int) -> None:
        if self.has_resolved:
            raise gl.vm.UserError("Market is already resolved.")
        side_norm = side.strip().upper()
        if side_norm == "YES":
            self.yes_pool = self.yes_pool + u256(amount)
        elif side_norm == "NO":
            self.no_pool = self.no_pool + u256(amount)
        else:
            raise gl.vm.UserError("Side must be YES or NO.")

    @gl.public.write
    def resolve_market(self) -> str:
        if self.has_resolved:
            raise gl.vm.UserError("Market is already resolved.")

        prompt = f"""
You are a decentralized truth oracle evaluator for GenLayer.
Evaluate whether the following event criteria were met using the web evidence.

Question: {self.question}
Criteria: {self.criteria}

Respond strictly in valid JSON without markdown:
{{
  "outcome": "YES",
  "reason": "Verified criteria met"
}}
"""

        def evaluate_claim():
            res = gl.nondet.exec_prompt(prompt)
            res = res.replace("```json", "").replace("```", "").strip()
            return res

        result_str = gl.eq_principle.prompt_comparative(
            evaluate_claim, "The outcome must be consistent between YES, NO, or UNCLEAR"
        )
        parsed = json.loads(result_str)
        self.outcome = str(parsed.get("outcome", "UNCLEAR"))
        self.resolution_reason = str(parsed.get("reason", "Consensus finalized"))
        self.has_resolved = True
        return self.outcome

    @gl.public.view
    def get_market(self) -> str:
        return json.dumps({
            "question": self.question,
            "criteria": self.criteria,
            "has_resolved": self.has_resolved,
            "outcome": self.outcome,
            "resolution_reason": self.resolution_reason,
            "yes_pool": str(self.yes_pool),
            "no_pool": str(self.no_pool)
        })
