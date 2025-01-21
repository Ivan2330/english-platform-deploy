import openai
import os
from dotenv import load_dotenv
from app.core.config import settings
# Завантаження змінних із .env
load_dotenv()

# Конфігурація OpenAI API
OPENAI_API_KEY = settings.OPENAI_API_KEY
OPENAI_API_URL = settings.OPENAI_API_URL

# Встановлення ключа API
openai.api_key = OPENAI_API_KEY
openai.api_base = OPENAI_API_URL

async def generate_feedback(task_type: str, student_answer: str, correct_answer: str = None, all_options: str = None) -> dict:
    """
    Генерує фідбек для завдань через OpenAI.
    - Для WRITING використовується GPT-4.
    - Для інших завдань GPT-3.5 Turbo.
    """
    model = "gpt-4" if task_type == "WRITING" else "gpt-3.5-turbo"

    prompt = f"""
    Тип завдання: {task_type}
    Відповідь студента: {student_answer}
    Правильна відповідь: {correct_answer if correct_answer else 'Не вказано'}
    Усі можливі варіанти: {all_options if all_options else 'Не вказано'}
    
    Дай пояснення українською мовою:
    - Чому відповідь студента неправильна (якщо це так).
    - Чому правильна відповідь правильна.
    - Якщо це WRITING, вкажи всі помилки, поясни їх і додай рекомендації.
    """

    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )

        feedback = response.choices[0].message["content"]
        return {
            "feedback_text": feedback,
            "detailed_feedback": feedback if task_type == "WRITING" else None
        }

    except openai.error.OpenAIError as e:
        raise RuntimeError(f"OpenAI API error: {str(e)}")
