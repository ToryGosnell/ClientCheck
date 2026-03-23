import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type AccountType = "contractor" | "customer";

const STORAGE_KEY = "selected_account_type";

export async function setSelectedAccountType(type: AccountType): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(STORAGE_KEY, type);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, type);
  } catch (error) {
    console.warn("[AccountType] Failed to save:", error);
  }
}

export async function getSelectedAccountType(): Promise<AccountType | null> {
  try {
    let value: string | null = null;
    if (Platform.OS === "web") {
      value = window.localStorage.getItem(STORAGE_KEY);
    } else {
      value = await SecureStore.getItemAsync(STORAGE_KEY);
    }
    if (value === "contractor" || value === "customer") return value;
    return null;
  } catch (error) {
    console.warn("[AccountType] Failed to read:", error);
    return null;
  }
}

export async function clearSelectedAccountType(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch (error) {
    console.warn("[AccountType] Failed to clear:", error);
  }
}
