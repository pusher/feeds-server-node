// @flow
export type ActionType = 'READ' | '*';

// All possible permissions for users
export const READ_PERMISSION = 'READ';
export const ALL_PERMISSION = '*';

// Permission types that clients may request; currently just "READ"
export const clientPermissionTypes: ActionType[] = [READ_PERMISSION];

export type FeedsPermissionClaims = {
  serviceClaims: {
    feeds: {
      permission: {
        path: string;
        action: ActionType;
      }
    }
  }
};

// Generates claims object in the format required by the underlying Pusher SDK.
export const getFeedsPermissionClaims = (action: ActionType, path: string): FeedsPermissionClaims => {
  return {
    serviceClaims: {
      feeds: {
        permission: {
          path,
          action
        }
      }
    }
  }
};
