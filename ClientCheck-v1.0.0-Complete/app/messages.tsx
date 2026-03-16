import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface Conversation {
  id: number;
  contractorId: number;
  contractorName: string;
  contractorTrade: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

// Mock conversations
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    contractorId: 1,
    contractorName: "Sarah Williams",
    contractorTrade: "Electrician",
    lastMessage: "Thanks for the tip about that customer!",
    lastMessageTime: new Date(Date.now() - 3600000),
    unreadCount: 0,
    messages: [
      {
        id: 1,
        senderId: 1,
        senderName: "Sarah Williams",
        content: "Hey! I just completed a job for John Doe. Any experience with him?",
        timestamp: new Date(Date.now() - 7200000),
        isOwn: false,
      },
      {
        id: 2,
        senderId: 0,
        senderName: "You",
        content: "Yeah, I worked with him last month. Watch out for scope creep - he kept adding extras.",
        timestamp: new Date(Date.now() - 6300000),
        isOwn: true,
      },
      {
        id: 3,
        senderId: 1,
        senderName: "Sarah Williams",
        content: "Thanks for the tip about that customer!",
        timestamp: new Date(Date.now() - 3600000),
        isOwn: false,
      },
    ],
  },
  {
    id: 2,
    contractorId: 2,
    contractorName: "Maria Garcia",
    contractorTrade: "Plumber",
    lastMessage: "Want to grab coffee and discuss the market?",
    lastMessageTime: new Date(Date.now() - 86400000),
    unreadCount: 1,
    messages: [
      {
        id: 1,
        senderId: 2,
        senderName: "Maria Garcia",
        content: "Want to grab coffee and discuss the market?",
        timestamp: new Date(Date.now() - 86400000),
        isOwn: false,
      },
    ],
  },
];

export default function MessagesScreen() {
  const colors = useColors();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: (selectedConversation.messages.length || 0) + 1,
      senderId: 0,
      senderName: "You",
      content: messageText,
      timestamp: new Date(),
      isOwn: true,
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === selectedConversation.id) {
          return {
            ...conv,
            messages: [...(conv.messages || []), newMessage],
            lastMessage: messageText,
            lastMessageTime: new Date(),
          };
        }
        return conv;
      })
    );

    setSelectedConversation((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...(prev.messages || []), newMessage],
        lastMessage: messageText,
        lastMessageTime: new Date(),
      };
    });

    setMessageText("");
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <Pressable
      onPress={() => setSelectedConversation(item)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        className="p-4 mb-2 rounded-lg flex-row items-center gap-3"
        style={{
          backgroundColor: selectedConversation?.id === item.id ? colors.primary : colors.surface,
        }}
      >
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{
            backgroundColor: selectedConversation?.id === item.id ? "rgba(255,255,255,0.3)" : colors.primary,
          }}
        >
          <Text className="text-lg font-bold" style={{ color: selectedConversation?.id === item.id ? "#fff" : colors.background }}>
            {item.contractorName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className="font-bold"
              style={{
                color: selectedConversation?.id === item.id ? "#fff" : colors.foreground,
              }}
            >
              {item.contractorName}
            </Text>
            {item.unreadCount > 0 && (
              <View
                className="rounded-full px-2 py-1"
                style={{ backgroundColor: colors.error }}
              >
                <Text className="text-xs font-bold text-white">{item.unreadCount}</Text>
              </View>
            )}
          </View>
          <Text
            className="text-xs mt-1"
            style={{
              color: selectedConversation?.id === item.id ? "rgba(255,255,255,0.7)" : colors.muted,
            }}
          >
            {item.contractorTrade}
          </Text>
          <Text
            className="text-xs mt-1 line-clamp-1"
            style={{
              color: selectedConversation?.id === item.id ? "rgba(255,255,255,0.7)" : colors.muted,
            }}
          >
            {item.lastMessage}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={{
        alignItems: item.isOwn ? "flex-end" : "flex-start",
        marginBottom: 8,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          backgroundColor: item.isOwn ? colors.primary : colors.surface,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          maxWidth: "80%",
        }}
      >
        <Text
          style={{
            color: item.isOwn ? "#fff" : colors.foreground,
            fontSize: 14,
          }}
        >
          {item.content}
        </Text>
        <Text
          style={{
            color: item.isOwn ? "rgba(255,255,255,0.6)" : colors.muted,
            fontSize: 11,
            marginTop: 4,
          }}
        >
          {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );

  if (selectedConversation) {
    return (
      <ScreenContainer className="p-0 flex-1">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          {/* Header */}
          <View className="p-4 flex-row items-center gap-3" style={{ backgroundColor: colors.surface }}>
            <Pressable onPress={() => setSelectedConversation(null)}>
              <Text className="text-lg">←</Text>
            </Pressable>
            <View>
              <Text className="font-bold text-foreground">{selectedConversation.contractorName}</Text>
              <Text className="text-xs text-muted">{selectedConversation.contractorTrade}</Text>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            data={selectedConversation.messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingVertical: 16 }}
            inverted
          />

          {/* Input */}
          <View className="p-4 flex-row gap-2 items-center" style={{ backgroundColor: colors.surface }}>
            <TextInput
              placeholder="Type a message..."
              value={messageText}
              onChangeText={setMessageText}
              placeholderTextColor={colors.muted}
              style={{
                flex: 1,
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
              }}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                opacity: messageText.trim() && !pressed ? 1 : 0.6,
              })}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Send</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-4">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Messages</Text>
            <Text className="text-sm text-muted mt-1">Connect with other contractors</Text>
          </View>

          {/* Conversations List */}
          <View>
            <Text className="text-sm font-bold text-foreground mb-2">
              {conversations.length} Conversations
            </Text>
            <FlatList
              data={conversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>

          {/* New Message Button */}
          <Pressable
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ textAlign: "center", fontWeight: "bold", color: "#fff" }}>
              + Start New Conversation
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
