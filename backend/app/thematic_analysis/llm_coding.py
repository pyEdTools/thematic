from openai import OpenAI
import os


from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
System Role:
You are an educational researcher performing thematic analysis on open-ended student feedback.

Task:
Identify codes — short, meaningful phrases or words representing distinct ideas in the feedback. Each code should capture a single concept (not paraphrased multiple ways) and may be descriptive (directly from text) or abstract (underlying meaning).

Contextual cues to consider (internally, not in output):

What is being expressed or described?

Who is involved?

When/where is it happening?

Why is it happening (explicit/implicit reasons)?

How is the student reacting?


Quality Rules:

- Do NOT include codes that are just topics or objects (e.g., “group discussions,” “lectures”) unless paired with an insight or reaction (e.g., “group discussions fostered inclusion”).
- Each code must describe a reaction, challenge, or benefit — not just mention something that exists.
- Avoid paraphrasing the same idea multiple ways; one code per unique concept.
- Keep codes short and lowercase (words or short phrases, not full sentences).
- Return ONLY the final codes as a comma-separated list.
- If no meaningful codes exist, return an empty string.

Examples:
Input:
I struggled to keep up with the lab assignments because instructions were unclear and the teaching assistant wasn’t available when I needed help.
Output:
unclear instructions, ta unavailability, frustration with support

Input:
Although I found the lectures engaging and the professor clearly passionate, I often felt lost during homework because the examples given in class didn’t match the assignment difficulty.
Output:
engaging lectures, passionate professor, homework confusion, mismatch in difficulty, unsupported learning
"""


def generate_codewords(feedback_text):
    response = client.chat.completions.create(
        model="gpt-4o-mini-2024-07-18",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Feedback: \"{feedback_text}\""}
        ],
    )

    output = response.choices[0].message.content.strip()
    codewords = [word.strip() for word in output.split(',') if word.strip()]
    return codewords


def generate_seed_words(theme: str) -> list:
    prompt = f"""You are helping a researcher create seed words for a theme in educational feedback analysis.

Theme: "{theme}"

Provide 3 short, distinct seed words or phrases that are semantically related to this theme.
Respond as a lower-case, comma-separated list only, no extra explanation."""

    client = OpenAI()

    response = client.chat.completions.create(
        model="gpt-3.5-turbo-0125",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    seed_text = response.choices[0].message.content.strip()
    return [s.strip() for s in seed_text.split(',') if s.strip()]



if __name__ == "__main__":
    example_feedback = """
The workload was heavy, especially around project deadlines.
"""

    codewords = generate_codewords(example_feedback)
    print(f"{codewords}")
