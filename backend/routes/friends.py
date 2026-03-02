"""
Friends API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Security, status
from sqlalchemy import or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from auth import get_current_active_user, security_scheme
from database import get_db
from models.friendship import Friendship, FriendshipStatus
from models.user import User
from schemas.friendship import (
    FriendListResponse,
    FriendRequest,
    FriendRequestResponse,
    FriendshipResponse,
)

router = APIRouter(prefix="/friends", tags=["friends"])


@router.post(
    "/request",
    response_model=FriendshipResponse,
    status_code=201,
    dependencies=[Security(security_scheme)],
)
async def send_friend_request(
    request: FriendRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a friend request to another user"""
    
    # Can't friend yourself
    if request.addressee_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request to yourself",
        )
    
    # Check if addressee exists
    result = await db.execute(select(User).where(User.id == request.addressee_id))
    addressee = result.scalar_one_or_none()
    if not addressee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Check if friendship already exists (in either direction)
    result = await db.execute(
        select(Friendship).where(
            or_(
                and_(
                    Friendship.requester_id == current_user.id,
                    Friendship.addressee_id == request.addressee_id,
                ),
                and_(
                    Friendship.requester_id == request.addressee_id,
                    Friendship.addressee_id == current_user.id,
                ),
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.status == FriendshipStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already friends with this user",
            )
        elif existing.status == FriendshipStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Friend request already pending",
            )
        elif existing.status == FriendshipStatus.REJECTED:
            # Allow re-sending if previously rejected
            existing.status = FriendshipStatus.PENDING
            existing.requester_id = current_user.id
            existing.addressee_id = request.addressee_id
            await db.commit()
            await db.refresh(existing, ["requester", "addressee"])
            return existing
    
    # Create new friendship
    friendship = Friendship(
        requester_id=current_user.id,
        addressee_id=request.addressee_id,
        status=FriendshipStatus.PENDING,
    )
    db.add(friendship)
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Friendship)
        .where(Friendship.id == friendship.id)
        .options(selectinload(Friendship.requester), selectinload(Friendship.addressee))
    )
    friendship = result.scalar_one()
    
    return friendship


@router.post(
    "/respond",
    response_model=FriendshipResponse,
    dependencies=[Security(security_scheme)],
)
async def respond_to_friend_request(
    response: FriendRequestResponse,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept or reject a friend request"""
    
    result = await db.execute(
        select(Friendship)
        .where(Friendship.id == response.friendship_id)
        .options(selectinload(Friendship.requester), selectinload(Friendship.addressee))
    )
    friendship = result.scalar_one_or_none()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found",
        )
    
    # Only the addressee can respond
    if friendship.addressee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot respond to this friend request",
        )
    
    if friendship.status != FriendshipStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friend request is not pending",
        )
    
    friendship.status = FriendshipStatus.ACCEPTED if response.accept else FriendshipStatus.REJECTED
    await db.commit()
    await db.refresh(friendship)
    
    return friendship


@router.get(
    "",
    response_model=list[FriendListResponse],
    dependencies=[Security(security_scheme)],
)
async def get_friends(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of accepted friends"""
    
    result = await db.execute(
        select(Friendship)
        .where(
            and_(
                Friendship.status == FriendshipStatus.ACCEPTED,
                or_(
                    Friendship.requester_id == current_user.id,
                    Friendship.addressee_id == current_user.id,
                ),
            )
        )
        .options(selectinload(Friendship.requester), selectinload(Friendship.addressee))
    )
    friendships = result.scalars().all()
    
    friends = []
    for f in friendships:
        # Get the other user (not current user)
        friend = f.addressee if f.requester_id == current_user.id else f.requester
        friends.append(
            FriendListResponse(
                id=friend.id,
                username=friend.username,
                first_name=friend.first_name,
                last_name=friend.last_name,
                avatar_url=friend.avatar_url,
                friendship_id=f.id,
            )
        )
    
    return friends


@router.get(
    "/requests/pending",
    response_model=list[FriendshipResponse],
    dependencies=[Security(security_scheme)],
)
async def get_pending_requests(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get pending friend requests received by current user"""
    
    result = await db.execute(
        select(Friendship)
        .where(
            and_(
                Friendship.addressee_id == current_user.id,
                Friendship.status == FriendshipStatus.PENDING,
            )
        )
        .options(selectinload(Friendship.requester), selectinload(Friendship.addressee))
    )
    return result.scalars().all()


@router.get(
    "/requests/sent",
    response_model=list[FriendshipResponse],
    dependencies=[Security(security_scheme)],
)
async def get_sent_requests(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get friend requests sent by current user"""
    
    result = await db.execute(
        select(Friendship)
        .where(
            and_(
                Friendship.requester_id == current_user.id,
                Friendship.status == FriendshipStatus.PENDING,
            )
        )
        .options(selectinload(Friendship.requester), selectinload(Friendship.addressee))
    )
    return result.scalars().all()


@router.delete(
    "/{friendship_id}",
    status_code=204,
    dependencies=[Security(security_scheme)],
)
async def remove_friend(
    friendship_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a friend or cancel a friend request"""
    
    result = await db.execute(
        select(Friendship).where(Friendship.id == friendship_id)
    )
    friendship = result.scalar_one_or_none()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friendship not found",
        )
    
    # Only participants can remove
    if friendship.requester_id != current_user.id and friendship.addressee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this friendship",
        )
    
    await db.delete(friendship)
    await db.commit()
