/**
 * Group API routes for Fineract Hasura Actions
 */

import { Router } from 'express';
import { groupHandlers } from '../handlers/group';

export const groupRoutes = Router();

// Group management routes
groupRoutes.post('/create', groupHandlers.createGroup);
groupRoutes.post('/update', groupHandlers.updateGroup);
groupRoutes.post('/get', groupHandlers.getGroup);
groupRoutes.post('/delete', groupHandlers.deleteGroup);
groupRoutes.post('/activate', groupHandlers.activateGroup);
groupRoutes.post('/close', groupHandlers.closeGroup);
groupRoutes.post('/search', groupHandlers.searchGroups);

// Member management routes
groupRoutes.post('/members/add', groupHandlers.addGroupMembers);
groupRoutes.post('/members/remove', groupHandlers.removeGroupMember);
groupRoutes.post('/roles/assign', groupHandlers.assignGroupRole);
groupRoutes.post('/roles/remove', groupHandlers.removeGroupRole);

// Group note routes
groupRoutes.post('/notes/add', groupHandlers.addGroupNote);

// Group transfer routes
groupRoutes.post('/transfer', groupHandlers.transferGroup);

// Group loan routes
groupRoutes.post('/loans/create', groupHandlers.createGroupLoan);
groupRoutes.post('/loans/list', groupHandlers.getGroupLoans);
groupRoutes.post('/loans/get', groupHandlers.getGroupLoanDetails);
groupRoutes.post('/loans/summary', groupHandlers.getGroupLoanSummary);