"""
Workflow State Machine Engine.

Enforces valid status transitions and role-based authorization.
This is the core non-CRUD behavior that prevents unauthorized or
invalid state changes to work items.

State Transition Matrix:
    open               -> in_investigation  (any team member)
    in_investigation   -> pending_approval  (any team member)
    in_investigation   -> resolved          (any team member, requires resolution_notes)
    pending_approval   -> approved          (lead or manager ONLY)
    pending_approval   -> rejected          (lead or manager ONLY, requires rejection_reason)
    approved           -> resolved          (any team member, requires resolution_notes)
    rejected           -> in_investigation  (any team member, re-open for rework)
    resolved           -> closed            (lead or manager ONLY)
    closed             -> open              (manager ONLY, re-open)
"""

from app.models.work_item import WorkItemStatus


# ── Transition Definitions ──────────────────────────────────

# Maps: current_status -> { target_status: required_roles }
# None means any team member can perform the transition
TRANSITION_MATRIX: dict[WorkItemStatus, dict[WorkItemStatus, list[str] | None]] = {
    WorkItemStatus.open: {
        WorkItemStatus.in_investigation: None,  # Any member can start investigating
    },
    WorkItemStatus.in_investigation: {
        WorkItemStatus.pending_approval: None,      # Any member can request approval
        WorkItemStatus.resolved: None,              # Direct resolve (simple items)
    },
    WorkItemStatus.pending_approval: {
        WorkItemStatus.approved: ["lead", "manager"],    # Only leads/managers approve
        WorkItemStatus.rejected: ["lead", "manager"],    # Only leads/managers reject
    },
    WorkItemStatus.approved: {
        WorkItemStatus.resolved: None,  # Any member can mark as resolved after approval
    },
    WorkItemStatus.rejected: {
        WorkItemStatus.in_investigation: None,  # Re-open for rework
    },
    WorkItemStatus.resolved: {
        WorkItemStatus.closed: ["lead", "manager"],  # Only leads/managers close
    },
    WorkItemStatus.closed: {
        WorkItemStatus.open: ["manager"],  # Only managers can re-open closed items
    },
}

# Transitions that require specific fields
TRANSITIONS_REQUIRING_NOTES: dict[WorkItemStatus, str] = {
    WorkItemStatus.resolved: "resolution_notes",
    WorkItemStatus.rejected: "rejection_reason",
}


class WorkflowError(Exception):
    """Raised when a workflow transition is invalid."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


def validate_transition(
    current_status: WorkItemStatus,
    target_status: WorkItemStatus,
    user_role: str,
    resolution_notes: str | None = None,
    rejection_reason: str | None = None,
) -> None:
    """
    Validate that a status transition is allowed given the current state and user role.

    Raises WorkflowError if:
    - The transition is not in the allowed matrix
    - The user doesn't have the required role
    - Required fields (resolution_notes, rejection_reason) are missing

    Args:
        current_status: Current work item status
        target_status: Desired new status
        user_role: The user's role in the owning team ('member', 'lead', 'manager')
        resolution_notes: Notes explaining the resolution (required for 'resolved')
        rejection_reason: Reason for rejection (required for 'rejected')
    """
    # 1. Check if transition path exists
    allowed_targets = TRANSITION_MATRIX.get(current_status, {})
    if target_status not in allowed_targets:
        valid_targets = list(allowed_targets.keys())
        raise WorkflowError(
            f"Cannot transition from '{current_status.value}' to '{target_status.value}'. "
            f"Valid transitions: {[t.value for t in valid_targets]}",
            status_code=400,
        )

    # 2. Check role authorization
    required_roles = allowed_targets[target_status]
    if required_roles is not None and user_role not in required_roles:
        raise WorkflowError(
            f"Transition to '{target_status.value}' requires role: {required_roles}. "
            f"Your role: '{user_role}'",
            status_code=403,
        )

    # 3. Check required fields
    if target_status == WorkItemStatus.resolved and not resolution_notes:
        raise WorkflowError(
            "Resolution notes are required when resolving a work item",
            status_code=400,
        )

    if target_status == WorkItemStatus.rejected and not rejection_reason:
        raise WorkflowError(
            "Rejection reason is required when rejecting a work item",
            status_code=400,
        )


def get_allowed_transitions(current_status: WorkItemStatus, user_role: str) -> list[str]:
    """
    Return a list of valid target statuses for a given current status and user role.
    Used by the frontend to render only valid action buttons.
    """
    allowed_targets = TRANSITION_MATRIX.get(current_status, {})
    result = []

    for target_status, required_roles in allowed_targets.items():
        if required_roles is None or user_role in required_roles:
            result.append(target_status.value)

    return result
