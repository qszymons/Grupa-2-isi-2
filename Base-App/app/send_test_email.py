import asyncio

from fastapi_mail import FastMail, MessageSchema, MessageType
from src.email_config import conf
from dotenv import load_dotenv

load_dotenv(".env.development")


async def send_email():
    html = """<p>Test email message.</p> """

    message = MessageSchema(
        subject="Test Email",
        recipients=["123olejnik123@gmail.com"],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)
    print("Email has been sent")


if __name__ == "__main__":
    asyncio.run(send_email())