# Classroom Schemas
from .classroom.classroom import ClassroomCreate, ClassroomUpdate, ClassroomResponse
from .classroom.classroom_task import ClassroomTaskAssign, ClassroomTaskUpdate, ClassroomTaskResponse
from .classroom.classroom_chat import ClassroomChatMessage, ClassroomChatHistory, ClassroomChatResponse
from .classroom.classroom_call import ClassroomCallCreate, ClassroomCallUpdate, ClassroomCallResponse
from .classroom.classroom_progress import ClassroomProgressUpdate, ClassroomProgressResponse

# Control Schemas
from .controls.universal_task import UniversalTaskCreate, UniversalTaskUpdate, UniversalTaskResponse
from .controls.ai_feedback import AIFeedbackCreate, AIFeedbackUpdate, AIFeedbackResponse
from .controls.task_result import TaskResultSubmit, TaskResultUpdate, TaskResultResponse

# User Schemas
from .users.students import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentSubscriptionUpdate,
    StudentLevelUpdate
)
from .users.staff import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    StaffRoleUpdate,
    StaffLogin
)
from .users.student_task import StudentTaskAssign, StudentTaskUpdate, StudentTaskResponse
