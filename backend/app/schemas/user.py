import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    role: Optional[UserRole] = UserRole.STUDENT
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=72)

    @field_validator("password")
    @classmethod
    def valid_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Mật khẩu không được vượt quá 72 byte UTF-8")
        return value


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def only_allow_product_roles(cls, value: Optional[UserRole]) -> Optional[UserRole]:
        if value == UserRole.TEACHER:
            raise ValueError("Vai trò giáo viên cũ không còn được cấp mới")
        return value


class AdminUserResponse(UserResponse):
    created_at: datetime
    last_login_at: Optional[datetime] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=72)

    _password_bytes = field_validator("password")(UserCreate.valid_password_bytes.__func__)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=4096)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=6, max_length=72)

    _password_bytes = field_validator("current_password", "new_password")(UserCreate.valid_password_bytes.__func__)
