import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAcademicConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/conversations/academic');
      return response.data.data.conversations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

export const fetchConversationMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ conversationId, page = 1, limit = 30 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
      return {
        messages: response.data.data.messages,
        page,
        hasMore: response.data.data.messages.length === limit,
        conversationId
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

const initialState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: [], // Array of user IDs currently connected
  loadingConversations: false,
  loadingMessages: false,
  messagesPage: 1,
  hasMoreMessages: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
      state.messages = [];
      state.messagesPage = 1;
      state.hasMoreMessages = false;
    },
    clearActiveConversation: (state) => {
      state.activeConversation = null;
      state.messages = [];
    },
    addIncomingMessage: (state, action) => {
      const msg = action.payload;
      // If message is for the active conversation, append it
      if (state.activeConversation && state.activeConversation._id === msg.conversationId) {
        // Prevent duplicate logs
        if (!state.messages.find(m => m._id === msg._id)) {
          state.messages.push(msg);
        }
      }

      // Update the snippet in conversation list
      const conv = state.conversations.find(c => c._id === msg.conversationId);
      if (conv) {
        conv.lastMessage = msg.message || `Attachment: ${msg.attachments[0]?.filename}`;
        conv.lastMessageAt = msg.createdAt;
        // Re-sort conversation list: newest message at top
        state.conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      }
    },
    updateConversationStatusState: (state, action) => {
      const { conversationId, status } = action.payload;
      if (state.activeConversation && state.activeConversation._id === conversationId) {
        state.activeConversation.status = status;
      }
      const conv = state.conversations.find(c => c._id === conversationId);
      if (conv) {
        conv.status = status;
      }
    },
    setOnlineUsersList: (state, action) => {
      state.onlineUsers = action.payload;
    },
    addUserOnline: (state, action) => {
      const { userId } = action.payload;
      if (!state.onlineUsers.includes(userId)) {
        state.onlineUsers.push(userId);
      }
    },
    removeUserOffline: (state, action) => {
      const { userId } = action.payload;
      state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
    },
    clearChatState: (state) => {
      state.conversations = [];
      state.activeConversation = null;
      state.messages = [];
      state.onlineUsers = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Conversations list
      .addCase(fetchAcademicConversations.pending, (state) => {
        state.loadingConversations = true;
      })
      .addCase(fetchAcademicConversations.fulfilled, (state, action) => {
        state.loadingConversations = false;
        state.conversations = action.payload;
      })
      .addCase(fetchAcademicConversations.rejected, (state) => {
        state.loadingConversations = false;
      })
      // Messages pagination load
      .addCase(fetchConversationMessages.pending, (state, action) => {
        if (action.meta.arg.page === 1) {
          state.loadingMessages = true;
        }
      })
      .addCase(fetchConversationMessages.fulfilled, (state, action) => {
        state.loadingMessages = false;
        const { messages, page, hasMore } = action.payload;
        if (page === 1) {
          state.messages = messages;
        } else {
          // Prepend older messages
          state.messages = [...messages, ...state.messages];
        }
        state.messagesPage = page;
        state.hasMoreMessages = hasMore;
      })
      .addCase(fetchConversationMessages.rejected, (state) => {
        state.loadingMessages = false;
      });
  }
});

export const {
  setActiveConversation,
  clearActiveConversation,
  addIncomingMessage,
  updateConversationStatusState,
  setOnlineUsersList,
  addUserOnline,
  removeUserOffline,
  clearChatState
} = chatSlice.actions;

export default chatSlice.reducer;
