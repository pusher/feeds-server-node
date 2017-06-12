// @flow
export type PermissionType = 'READ' | 'WRITE' | '*';

// All possible permission for users
export const READ_PERMISSION = 'READ';
export const WRITE_PERMISSION = 'READ';
export const ALL_PERMISSION = '*';

// Permission types that clients may request; currently just "READ"
export const clientPermissionTypes: Array<PermissionType> = [READ_PERMISSION, WRITE_PERMISSION, ALL_PERMISSION];

export type FeedsPermissionClaims = {
  serviceClaims: {
    feeds: {
      permission: {
        feed_id: string;
        type: PermissionType;
      }
    }
  }
};

// Generates claims object for in format for uderlying Pusher SDK.
export const getFeedsPermissionClaims = (feedId: string, type: PermissionType): FeedsPermissionClaims => {
  return {
    serviceClaims: {
      feeds: {
        permission: {
          feed_id: feedId,
          type: type
        }
      }
    }
  }
};