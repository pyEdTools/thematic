import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path

# Robust .env loading
base_dir = Path(__file__).resolve().parent.parent.parent
env_path = base_dir / ".env"
load_dotenv(dotenv_path=env_path)

OPENAI_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_KEY:
    raise ValueError(f"OPENAI_API_KEY is missing from {env_path}")

openai_client = OpenAI(api_key=OPENAI_KEY)

def get_coding_prompt(content: str) -> str:
    return """
Imagine that you are a researcher in education analyzing open-ended feedback. Your task is to identify and label meaningful segments of the text to categorize and analyze them for thematic analysis. 

These segments will be known as ‘codes’ and codes can vary in size (i.e. phrases, short sentences, words), but usually codes encompass a complete thought. They can take the form of a descriptive label that directly describes or is taken from the content of the text. However, codes may also be more abstract and complex in the form of literacy references or metaphors. Your job will be to identify these differences by adopting a strategy first.

STRATEGY:
Before you label, adopt the strategy of asking yourself:
- What is a student expressing or describing?
- Who is involved in the student’s experience, and what roles do they play?
- When did this experience occur in the learning process?
- Where in the educational context is this taking place?
- What are the stated or underlying reasons behind the student’s experience?
- How is the student navigating or reacting to the situation?

TASK:
Analyze this feedback segment: "{content}"

Identify 1 to 5 distinct codes. For each code, provide a lowercase label and a sentiment score (-1.0 to 1.0).

RULES:
1. Each code should represent a clearly different idea or source of meaning.
2. Be brief and do not paraphrase the same concept multiple ways.
3. Use lowercase for all codes.
4. Return ONLY a JSON object.

JSON FORMAT:
{
  "codes": [
    {"code": "code label", "sentiment": 0.5},
    {"code": "another label", "sentiment": -0.2}
  ]
}

Example #1:
feedback: I struggled to keep up with the lab assignments because instructions were unclear and the teaching assistant wasn’t available when I needed help.
Output: {
  "codes": [
    {"code": "lab assignment confusion", "sentiment": -0.6},
    {"code": "lack of instructional clarity", "sentiment": -0.5},
    {"code": "frustration with support", "sentiment": -0.7},
    {"code": "learning barrier during labs", "sentiment": -0.4},
    {"code": "ta unavailability", "sentiment": -0.8}
  ]
}

Example #2:
feedback: Although I found the lectures engaging and the professor clearly passionate, I often felt lost during homework because the examples given in class didn’t match the assignment difficulty.
Output: {
  "codes": [
    {"code": "engaging lectures", "sentiment": 0.8},
    {"code": "passionate professor", "sentiment": 0.9},
    {"code": "homework confusion", "sentiment": -0.5},
    {"code": "mismatch in difficulty", "sentiment": -0.6},
    {"code": "unsupported learning", "sentiment": -0.4},
    {"code": "post-class struggle", "sentiment": -0.3}
  ]
}

Example #3: 
feedback: The group project was helpful because I finally understood the topic after discussing it with my peers.
Output: {
  "codes": [
    {"code": "group learning", "sentiment": 0.8},
    {"code": "improved understanding", "sentiment": 0.7}
  ]
}

Example #4:
feedback: professor was rude
Output: {
  "codes": [
    {"code": "rude professor", "sentiment": -0.9}
  ]
}
""".replace("{content}", content)

def extract_codes(content: str) -> list:
    prompt = get_coding_prompt(content)
    completion = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={ "type": "json_object" }
    )
    
    res_content = completion.choices[0].message.content
    raw_data = json.loads(res_content)
    extracted_list = raw_data.get('codes', raw_data) if isinstance(raw_data, dict) else raw_data
    
    if not isinstance(extracted_list, list):
        extracted_list = [extracted_list]
        
    return extracted_list
