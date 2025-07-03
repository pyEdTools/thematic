from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """

You are an educational researcher analyzing qualitative student feedback for thematic insights.

Given the feedback below, identify **1 to 3 codes** that reflect the underlying themes or meanings. Focus on interpretation, not just keywords. Return only the codes, separated by commas.
Follow the definition of a code word in theme analysis: “A code is simply a short,
descriptive word or phrase that assigns meaning to the data related to the researcher’s analytic
interests."

Example:

Feedback: "I liked the interactive parts of the lecture but the material felt rushed and I had trouble keeping up."

Output: student engagement, pacing issues, cognitive overload
"""


def generate_codewords(feedback_text):
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Feedback: \"{feedback_text}\""}
        ],
        temperature=0.3
    )

    return response.choices[0].message.content.strip()




if __name__ == "__main__":
    example_feedback = """
I liked how the course linked neurological diseases like Parkinson’s to underlying brain mechanisms. It made the material feel very relevant.    """
    codewords = generate_codewords(example_feedback)
    print(f"{codewords}")
