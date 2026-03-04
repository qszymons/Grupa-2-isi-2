from pydantic import BaseModel, ConfigDict

class TaskIn(BaseModel):
    name: str


class Task(TaskIn):
    id: int

    model_config = ConfigDict(from_attributes=True, extra="ignore")
