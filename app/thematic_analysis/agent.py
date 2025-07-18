from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
Imagine that you are a researcher in education analyzing open-ended feedback. Your task is to identify and label meaningful segments of the text to categorize and analyze them for thematic analysis. 

These segments will be known as ‘codes’ and codes can vary in size(i.e. phrases, short sentences, words), but usually codes encompass a complete thought. They can take the form of a descriptive label that directly describes or is taken from the content of the text. However, codes may also be more abstract and complex in the form of literacy references or metaphors. Your job will be to identify these differences by adopting a strategy first.

For the text, before you label adopt the following strategy of asking yourself:
What is a student expressing or describing?
Who is involved in the student’s experience, and what roles do they play?
When did this experience occur in the learning process?
Where in the educational context is this taking place?
What are the stated or underlying reasons behind the student’s experience?
How is the student navigating or reacting to the situation?

Once you adopt this strategy,

Each codeword should represent a clearly different idea or source of meaning. Be brief and do not paraphrase the same concept multiple ways. Output in a comma-separated lowercase list.

Example #1:
feedback:
I struggled to keep up with the lab assignments because instructions were unclear and the teaching assistant wasn’t available when I needed help.

Strategy
What is the student expressing?
Struggle with lab assignments


Who is involved?
Teaching assistant


When did it occur?
During assignments


Where did it happen?
Lab setting


Why did it happen (explicit or implicit)?
Unclear instructions, lack of TA support


How is the student reacting?
Expressing frustration and lack of support


lab assignment confusion, lack of instructional clarity, frustration with support, earning barrier during labs, TA unavailability

Example #2:
feedback:
Although I found the lectures engaging and the professor clearly passionate, I often felt lost during homework because the examples given in class didn’t match the assignment difficulty.
engaging lectures, passionate professor, homework confusion, mismatch in difficulty, unsupported learning, post-class struggle

Example #3: 
feedback:
The group project was helpful because I finally understood the topic after discussing it with my peers.
group learning, improved understanding

Example #4:
Feedback: 
professor was rude
rude professor

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
I think in general, I felt a lot more confident about myself and like being able to do projects like this and just, I guess, do research, after the program. Because in the start, there's, it seemed like there's just a lot to do, like the project, the paper, the presentation and stuff like that. But then like there's really good guidance and help and structuredness to like the program and stuff. So, yeah. I think one part was like evolving, like a person able to, I guess, write because like, at least for me, I hadn't written any research papers before the program, but like basically through the program, there are like these discussion sections where like, basically they just told us how to write the paper. Like in this section, you need like these elements and in this section, you need like other elements. So like, I just like learned a lot and like evolved as like a person who thought that I could write papers in the future.
"""

    codewords = generate_codewords(example_feedback)
    print(f"{codewords}")
