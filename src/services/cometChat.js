import { CometChat } from '@cometchat-pro/react-native-chat';

export const COMETCHAT_ROLES = {
  BASIC_USER: 'default',
  SELF_ADVOCATE: 'self-advocate',
  SUPPORTER: 'supporter',
  DATING_USER: 'dating-user'
};

export const updateUserRole = async (uid, role) => {
  try {
    const user = await CometChat.getUser(uid);
    if (!user) {
      console.error('User not found in CometChat');
      return;
    }

    // Update user's role
    await CometChat.updateUser(
      new CometChat.User({
        uid: uid,
        role: role
      })
    );

    console.log('Successfully updated user role in CometChat:', role);
  } catch (error) {
    console.error('Error updating CometChat user role:', error);
    throw error;
  }
};

export const grantSupporterAccess = async (supporterUid, userUid) => {
  try {
    // Create a group specifically for supporter access
    const groupId = `support_${userUid}`;
    const groupName = `Support Group for ${userUid}`;
    
    // Check if group exists
    try {
      await CometChat.getGroup(groupId);
    } catch (error) {
      // Group doesn't exist, create it
      const group = new CometChat.Group(
        groupId,
        groupName,
        CometChat.GROUP_TYPE.PRIVATE,
        ''
      );
      await CometChat.createGroup(group);
    }

    // Add supporter to group with moderator scope
    await CometChat.addMembersToGroup(groupId, [
      new CometChat.GroupMember(supporterUid, CometChat.GROUP_MEMBER_SCOPE.MODERATOR)
    ], []);

    console.log('Successfully granted supporter access');
  } catch (error) {
    console.error('Error granting supporter access:', error);
    throw error;
  }
};

export const revokeSupporterAccess = async (supporterUid, userUid) => {
  try {
    const groupId = `support_${userUid}`;
    
    // Remove supporter from group
    await CometChat.banGroupMember(groupId, supporterUid);
    
    console.log('Successfully revoked supporter access');
  } catch (error) {
    console.error('Error revoking supporter access:', error);
    throw error;
  }
};

// Function to check if a user is a supporter for another user
export const isSupporterFor = async (supporterUid, userUid) => {
  try {
    const groupId = `support_${userUid}`;
    const member = await CometChat.getGroupMember(groupId, supporterUid);
    return member && member.scope === CometChat.GROUP_MEMBER_SCOPE.MODERATOR;
  } catch (error) {
    return false;
  }
};

// Function to get all chats accessible to a supporter
export const getSupporterChats = async (supporterUid) => {
  try {
    const groups = await CometChat.getJoinedGroups(
      new CometChat.GroupsRequestBuilder()
        .setLimit(100)
        .build()
    );

    return groups.filter(group => group.id.startsWith('support_'));
  } catch (error) {
    console.error('Error getting supporter chats:', error);
    return [];
  }
}; 