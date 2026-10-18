"""
Tests for Workflow State Machine & Role-Based Access Control (RBAC).

Validates:
- Valid state progression (open -> in_investigation -> pending_approval -> approved -> resolved -> closed)
- Role gating: only leads/managers can approve or reject items
- Required fields enforcement (resolution notes on resolve, rejection reason on reject)
- Illegal transition jumps (e.g., open -> approved, resolved -> pending_approval)
- Allowed transitions calculation per user role
"""

import pytest
from app.models.work_item import WorkItemStatus
from app.services.workflow_engine import (
    validate_transition,
    get_allowed_transitions,
    WorkflowError,
    TRANSITION_MATRIX,
)


class TestWorkflowEngineRules:
    """Unit tests for the workflow engine transition matrix."""

    def test_member_can_start_investigation(self):
        """Any team member can move an open item to in_investigation."""
        validate_transition(
            current_status=WorkItemStatus.open,
            target_status=WorkItemStatus.in_investigation,
            user_role="member",
        )

    def test_member_can_request_approval(self):
        """Any team member can submit an item in investigation for approval."""
        validate_transition(
            current_status=WorkItemStatus.in_investigation,
            target_status=WorkItemStatus.pending_approval,
            user_role="member",
        )

    def test_member_cannot_approve(self):
        """A regular member MUST NOT be allowed to approve items (requires lead or manager)."""
        with pytest.raises(WorkflowError) as exc_info:
            validate_transition(
                current_status=WorkItemStatus.pending_approval,
                target_status=WorkItemStatus.approved,
                user_role="member",
            )
        assert exc_info.value.status_code == 403
        assert "requires role" in exc_info.value.message

    def test_lead_can_approve(self):
        """Team lead has permission to approve pending items."""
        validate_transition(
            current_status=WorkItemStatus.pending_approval,
            target_status=WorkItemStatus.approved,
            user_role="lead",
        )

    def test_manager_can_approve(self):
        """Manager has permission to approve pending items."""
        validate_transition(
            current_status=WorkItemStatus.pending_approval,
            target_status=WorkItemStatus.approved,
            user_role="manager",
        )

    def test_rejection_requires_reason(self):
        """Rejecting an item requires a valid rejection reason."""
        with pytest.raises(WorkflowError) as exc_info:
            validate_transition(
                current_status=WorkItemStatus.pending_approval,
                target_status=WorkItemStatus.rejected,
                user_role="lead",
                rejection_reason=None,
            )
        assert exc_info.value.status_code == 400
        assert "Rejection reason is required" in exc_info.value.message

    def test_rejection_with_reason_succeeds(self):
        """Rejecting an item with a reason passes validation."""
        validate_transition(
            current_status=WorkItemStatus.pending_approval,
            target_status=WorkItemStatus.rejected,
            user_role="lead",
            rejection_reason="Insufficient root cause analysis provided.",
        )

    def test_resolution_requires_notes(self):
        """Resolving an item requires resolution notes."""
        with pytest.raises(WorkflowError) as exc_info:
            validate_transition(
                current_status=WorkItemStatus.approved,
                target_status=WorkItemStatus.resolved,
                user_role="member",
                resolution_notes=None,
            )
        assert exc_info.value.status_code == 400
        assert "Resolution notes are required" in exc_info.value.message

    def test_resolution_with_notes_succeeds(self):
        """Resolving an item with notes passes validation."""
        validate_transition(
            current_status=WorkItemStatus.approved,
            target_status=WorkItemStatus.resolved,
            user_role="member",
            resolution_notes="Patched query in DB index and verified p99 latency dropped to 12ms.",
        )

    def test_member_cannot_close_resolved_item(self):
        """Only leads or managers can close resolved items."""
        with pytest.raises(WorkflowError) as exc_info:
            validate_transition(
                current_status=WorkItemStatus.resolved,
                target_status=WorkItemStatus.closed,
                user_role="member",
            )
        assert exc_info.value.status_code == 403

    def test_lead_can_close_resolved_item(self):
        """Lead can close resolved items."""
        validate_transition(
            current_status=WorkItemStatus.resolved,
            target_status=WorkItemStatus.closed,
            user_role="lead",
        )

    def test_only_manager_can_reopen_closed_item(self):
        """Only managers can re-open items that were closed."""
        with pytest.raises(WorkflowError) as exc_info:
            validate_transition(
                current_status=WorkItemStatus.closed,
                target_status=WorkItemStatus.open,
                user_role="lead",
            )
        assert exc_info.value.status_code == 403

        # Manager can reopen
        validate_transition(
            current_status=WorkItemStatus.closed,
            target_status=WorkItemStatus.open,
            user_role="manager",
        )

    def test_illegal_state_jump_rejected(self):
        """Directly jumping from open to approved without investigation is rejected."""
        with pytest.raises(WorkflowError) as exc_info:
            validate_transition(
                current_status=WorkItemStatus.open,
                target_status=WorkItemStatus.approved,
                user_role="manager",
            )
        assert exc_info.value.status_code == 400
        assert "Cannot transition from 'open' to 'approved'" in exc_info.value.message


class TestAllowedTransitionsForUI:
    """Verifies that the allowed transitions helper returns accurate options for UI buttons."""

    def test_pending_approval_ui_buttons(self):
        # A regular member sees NO transitions from pending_approval
        member_transitions = get_allowed_transitions(WorkItemStatus.pending_approval, "member")
        assert member_transitions == []

        # A lead sees approved and rejected
        lead_transitions = get_allowed_transitions(WorkItemStatus.pending_approval, "lead")
        assert set(lead_transitions) == {"approved", "rejected"}

    def test_open_ui_buttons(self):
        transitions = get_allowed_transitions(WorkItemStatus.open, "member")
        assert transitions == ["in_investigation"]
