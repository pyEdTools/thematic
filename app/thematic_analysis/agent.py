from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are an educational researcher analyzing qualitative feedback from students. Your task is to generate a small, meaningful set of short code words or phrases 
that capture the core ideas and underlying meaning of each response.

Generate only as many code words as are necessary to represent the feedback well (usually 1–4).
For shorter responses, generate fewer code words. For longer or more complex ones, you may include more but not too many, but keep it concise.

Code words must:
- Reflect the researcher’s analytic interest: educational feedback.
- Be interpretable, descriptive, and meaningful.
- Avoid repeating surface-level words from the original text.

Return the code words in a single comma-separated line.

Examples: 

======================================
Feedback:
“I was intimidated at first by how good everyone else seemed at coding. But over time, I realized I could keep up and even learned a lot from working with others.”
imposter syndrome, peer learning, growth mindset
======================================
Feedback:
"I really appreciated that the instructor gave us flexibility in how we tackled the project. It made me more confident about my own process."
autonomy, self-confidence
=======================================
Feedback: 
I think I went into the program a little unprepared and I was one of the youngest participants there. So I kind of viewed everyone there as like, I’d say like smarter than me or better at programming. 
And I mean, I guess that changed as I worked with them and I got to know them better. But like, I got to see how like, their skills actually were, because they were in fact better at programming than I was.
And, but like, I appreciated that they helped me and things like that. But ultimately, like, I think they were just kind of like inspiring to me. 
Like I wanted to be like them when I was at their age, but I did kind of view them as like, kind of above me in a way. I think at the start of the program,
I was like a little bit like frozen in fear because like it was kind of like all at once, right? We just like jumped into programming from day one.
But I think as the program went on, like I got into it, people helped me and I kind of realized, ‘hey, I can do this. It’s a learning process. 
Sure, I might have started a little late, but it’s still doable’. So I think I just like I just started working, I guess. And like I just realized I can do something to change like my abilities. So it got better as the course went on.

initial-intimadation, peer inspiration, growth mindset, overcoming fear, learning process
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

    output = response.choices[0].message.content.strip()
    codewords = [word.strip() for word in output.split(',') if word.strip()]
    return codewords


def generate_seed_words(theme: str) -> list:
    prompt = f"""You are helping a researcher create seed words for a theme in educational feedback analysis.

Theme: "{theme}"

Provide 3 short, distinct seed words or phrases that are semantically related to this theme.
Respond as a comma-separated list only, no extra explanation."""

    client = OpenAI()

    response = client.chat.completions.create(
        model="gpt-3.5-turbo-0125",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5
    )

    seed_text = response.choices[0].message.content.strip()
    return [s.strip() for s in seed_text.split(',') if s.strip()]



if __name__ == "__main__":
    example_feedback = """
I think in general, I felt a lot more confident about myself and like being able to do projects like this and just, I guess, do research, after the program. Because in the start, there's, it seemed like there's just a lot to do, like the project, the paper, the presentation and stuff like that. But then like there's really good guidance and help and structuredness to like the program and stuff. So, yeah. I think one part was like evolving, like a person able to, I guess, write because like, at least for me, I hadn't written any research papers before the program, but like basically through the program, there are like these discussion sections where like, basically they just told us how to write the paper. Like in this section, you need like these elements and in this section, you need like other elements. So like, I just like learned a lot and like evolved as like a person who thought that I could write papers in the future.
"""

    codewords = generate_codewords(example_feedback)
    print(f"{codewords}")
