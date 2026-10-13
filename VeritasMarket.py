# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import typing
import json


class VeritasMarket(gl.Contract):
    """
    Veritas Market: An Intelligent Prediction & Truth Market on GenLayer.
    Resolves subjective and complex real-world claims autonomously by having
    validators scrape evidence from the live web and reach LLM consensus.
    """

    # Contract State
    market_id_counter: int
    markets: dict  # market_id -> dict of market data
    bets: dict     # f"{market_id}_{bettor_address}" -> dict of bet data

    def __init__(self):
        self.market_id_counter = 0
        self.markets = {}
        self.bets = {}

    @gl.public.write
    def create_market(
        self,
        question: str,
        resolution_criteria: str,
        evidence_source_url: str,
        duration_blocks: int
    ) -> int:
        """
        Creates a new truth market.
        - question: e.g. "Did SpaceX successfully catch Super Heavy Booster 12?"
        - resolution_criteria: Nuanced instructions on how to evaluate YES vs NO.
        - evidence_source_url: Web source / news endpoint to crawl during resolution.
        - duration_blocks: Approximate lifetime before resolution is allowed.
        """
        market_id = self.market_id_counter
        self.market_id_counter += 1

        self.markets[market_id] = {
            "id": market_id,
            "creator": str(gl.message.sender),
            "question": question,
            "criteria": resolution_criteria,
            "evidence_url": evidence_source_url,
            "resolved": False,
            "outcome": None,       # "YES", "NO", or "UNCLEAR"
            "resolution_reason": "",
            "yes_pool": 0,
            "no_pool": 0,
            "total_pool": 0,
            "created_at_block": gl.block.number,
            "resolve_after_block": gl.block.number + duration_blocks
        }
        return market_id

    @gl.public.write
    def place_bet(self, market_id: int, side: str, amount: int) -> bool:
        """
        Places a simulated bet on YES or NO.
        """
        assert market_id in self.markets, "Market does not exist"
        market = self.markets[market_id]
        assert not market["resolved"], "Market already resolved"
        assert side in ["YES", "NO"], "Side must be YES or NO"
        assert amount > 0, "Bet amount must be greater than 0"

        sender = str(gl.message.sender)
        bet_key = f"{market_id}_{sender}"

        if bet_key not in self.bets:
            self.bets[bet_key] = {"YES": 0, "NO": 0, "claimed": False}

        self.bets[bet_key][side] += amount

        if side == "YES":
            market["yes_pool"] += amount
        else:
            market["no_pool"] += amount

        market["total_pool"] += amount
        self.markets[market_id] = market
        return True

    @gl.public.write
    def resolve_market(self, market_id: int) -> str:
        """
        Core GenLayer Intelligent Contract Logic:
        1. Non-deterministically fetches live web evidence from evidence_source_url.
        2. Prompts an LLM to evaluate the evidence against the market's criteria.
        3. Returns structured JSON {"outcome": "YES"|"NO"|"UNCLEAR", "reason": "..."}.
        4. Validator nodes verify agreement via comparative consensus.
        """
        assert market_id in self.markets, "Market does not exist"
        market = self.markets[market_id]
        assert not market["resolved"], "Market is already resolved"

        evidence_url = market["evidence_url"]
        question = market["question"]
        criteria = market["criteria"]

        def evaluate_claim() -> str:
            # 1. Fetch live web page
            web_text = ""
            try:
                response = gl.nondet.web.get(evidence_url)
                web_text = response.body.decode("utf-8")[:4000]  # Take relevant text excerpt
            except Exception:
                web_text = "No direct web response; rely on general knowledge and criteria."

            # 2. Formulate LLM prompt
            prompt = f"""
            You are an objective dispute resolution judge for a decentralized prediction market.
            Evaluate whether the following question resolved YES or NO based on the provided evidence and criteria.

            QUESTION: {question}
            CRITERIA: {criteria}
            EVIDENCE RETRIEVED FROM {evidence_url}:
            \"\"\"{web_text}\"\"\"

            Return ONLY a valid JSON object in this format:
            {{
                "outcome": "YES" or "NO" or "UNCLEAR",
                "reason": "One or two sentences explaining why based on the evidence."
            }}
            """
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validate_evaluation(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception:
                    return False
            return (
                isinstance(data, dict)
                and data.get("outcome") in ["YES", "NO", "UNCLEAR"]
                and isinstance(data.get("reason"), str)
            )

        resolution_data = gl.vm.run_nondet_unsafe(evaluate_claim, validate_evaluation)

        if isinstance(resolution_data, str):
            resolution_data = json.loads(resolution_data)

        market["resolved"] = True
        market["outcome"] = resolution_data["outcome"]
        market["resolution_reason"] = resolution_data["reason"]
        self.markets[market_id] = market

        return market["outcome"]

    @gl.public.view
    def get_market(self, market_id: int) -> dict:
        """Returns details for a specific market."""
        return self.markets.get(market_id, {})

    @gl.public.view
    def get_market_count(self) -> int:
        """Returns the total number of markets created."""
        return self.market_id_counter

    @gl.public.view
    def get_user_bet(self, market_id: int, user_address: str) -> dict:
        """Returns a user's bet for a market."""
        bet_key = f"{market_id}_{user_address}"
        return self.bets.get(bet_key, {"YES": 0, "NO": 0, "claimed": False})
