# Classroom Schemas
from .classrooms.classroom import ClassroomBase, ClassroomCreate, ClassroomResponse, ClassroomType, ClassroomUpdate
from .classrooms.classroom_task import ClassroomTaskBase, ClassroomTaskCreate, ClassroomTaskResponse
from .connection.chat import ChatBase, ChatCreate, ChatMessageBase, ChatMessageCreate, ChatResponse, ChatMessageResponse, ChatMessageUpdate, ChatUpdate, ChatWithMessages
from .connection.call import CallBase, CallCreate, CallParticipantBase, CallParticipantCreate, CallParticipantResponse, CallParticipantUpdate, CallResponse, CallUpdate
from .classrooms.classroom_progress import ClassroomProgressUpdate, ClassroomProgressResponse

# Control Schemas
from .controls.universal_task import UniversalTaskBase, UniversalTaskCreate, UniversalTaskResponse, UniversalTaskUpdate
from .controls.ai_feedback import AIFeedbackBase, AIFeedbackCreate, AIFeedbackResponse
from .controls.task_result import TaskResultBase, TaskResultCreate, TaskResultResponse, TaskResultUpdate

# User Schemas
from .users.students import (
    StudentBalanceUpdate,
    StudentBase, 
    StudentCreate,
    StudentLevelUpdate, 
    StudentResponse,
    StudentSubscriptionUpdate, 
    StudentUpdate
)
from .users.staff import (
    StaffBase,
    StaffCreate,
    StaffLogin, 
    StaffResponse,
    StaffRoleUpdate,
    StaffUpdate
)

