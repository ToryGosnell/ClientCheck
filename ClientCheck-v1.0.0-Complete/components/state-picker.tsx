import React, { createElement, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

export type StateOption = { abbr: string; name: string };

const US_STATES: StateOption[] = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" }, { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" }, { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" },
];

export interface StatePickerProps {
  /** Optional override list; if omitted, built-in US_STATES is used */
  states?: StateOption[];
  /** Legacy: selected abbreviation */
  selectedState?: string | null;
  /** Preferred: same as selectedState */
  value?: string | null;
  onSelect?: (abbr: string) => void;
  onChange?: (abbr: string) => void;
  onClear?: () => void;
}

const noop = () => {};

export function StatePicker(props: StatePickerProps) {
  const colors = useColors();
  /** Omitted / null → built-in US list. Explicit `states={[]}` hides picker. */
  const states = props.states == null ? US_STATES : props.states;

  useEffect(() => {
    console.log("StatePicker loaded");
  }, []);

  const safeStates = Array.isArray(states) ? states : [];
  if (!safeStates.length) {
    return null;
  }

  const rawValue = props.value ?? props.selectedState ?? "";
  const value = rawValue ?? "";
  const onSelect = typeof props.onSelect === "function" ? props.onSelect : noop;
  const onChange = typeof props.onChange === "function" ? props.onChange : noop;
  const onClear = typeof props.onClear === "function" ? props.onClear : noop;

  const applySelection = (abbr: string) => {
    onSelect(abbr);
    onChange(abbr);
  };

  if (Platform.OS === "web") {
    return (
      <StatePickerWeb
        states={safeStates}
        value={value}
        colors={colors}
        onSelect={applySelection}
        onClear={onClear}
      />
    );
  }

  return (
    <StatePickerNative
      states={safeStates}
      value={value}
      colors={colors}
      onSelect={applySelection}
      onClear={onClear}
    />
  );
}

function StatePickerWeb({
  states,
  value,
  colors,
  onSelect,
  onClear,
}: {
  states: StateOption[];
  value: string;
  colors: ReturnType<typeof useColors>;
  onSelect: (abbr: string) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return states;
    const q = search.trim().toLowerCase();
    return states.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.abbr.toLowerCase() === q ||
        s.abbr.toLowerCase().startsWith(q),
    );
  }, [search, states]);

  const selectStyle: CSSProperties = {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: typeof colors.border === "string" ? colors.border : "#333",
    backgroundColor: typeof colors.surface === "string" ? colors.surface : "#111",
    color: typeof colors.foreground === "string" ? colors.foreground : "#fff",
    fontSize: 14,
    outline: "none",
  };

  return (
    <View style={st.row}>
      {[
        <View key="col" style={st.webSearchCol}>
          {[
            <View key="sw" style={[st.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                <Text key="si" style={[st.searchIcon, { color: colors.muted }]}>🔍</Text>,
                <TextInput
                  key="tin"
                  style={[st.searchInput, { color: colors.foreground }]}
                  placeholder="Find a state…"
                  placeholderTextColor={colors.muted}
                  value={search}
                  onChangeText={setSearch}
                />,
              ]}
            </View>,
            <View key="sel" style={st.webSelectWrap}>
              {createElement(
                "select",
                {
                  value: value || "",
                  onChange: (e: { target: { value: string } }) => onSelect(e.target.value),
                  style: selectStyle,
                },
                createElement("option", { value: "" }, "All states (optional)"),
                ...filtered.map((s) =>
                  createElement("option", { key: s.abbr, value: s.abbr }, `${s.name} (${s.abbr})`),
                ),
              )}
            </View>,
          ]}
        </View>,
        !!value ? (
          <Pressable key="clr" onPress={onClear} style={[st.clearBtn, st.clearBtnSpaced, st.clearAlign, { borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>✕ Clear</Text>
          </Pressable>
        ) : null,
      ]}
    </View>
  );
}

function StatePickerNative({
  states,
  value,
  colors,
  onSelect,
  onClear,
}: {
  states: StateOption[];
  value: string;
  colors: ReturnType<typeof useColors>;
  onSelect: (abbr: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return states;
    const q = search.trim().toLowerCase();
    return states.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.abbr.toLowerCase() === q ||
        s.abbr.toLowerCase().startsWith(q),
    );
  }, [search, states]);

  const selectedLabel = value
    ? states.find((s) => s.abbr === value)?.name ?? value
    : null;

  return (
    <>
      <View style={st.row}>
        {[
          <Pressable
            key="tr"
            onPress={() => setOpen(true)}
            style={[st.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {[
              <Text key="t1" style={[st.triggerText, { color: selectedLabel ? colors.foreground : colors.muted }]}>
                {`🗺️ ${selectedLabel ?? "All states · optional"}`}
              </Text>,
              <Text key="t2" style={{ color: colors.muted, fontSize: 12 }}>▼</Text>,
            ]}
          </Pressable>,
          !!value ? (
            <Pressable key="cl" onPress={onClear} style={[st.clearBtn, st.clearBtnSpaced, st.clearAlign, { borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>✕ Clear</Text>
            </Pressable>
          ) : null,
        ]}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[st.modal, { backgroundColor: colors.background, borderColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => {}}
          >
            {[
              <Text key="mt" style={[st.modalTitle, { color: colors.foreground }]}>Filter by state</Text>,
              <View key="mw" style={[st.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {[
                  <Text key="msi" style={[st.searchIcon, { color: colors.muted }]}>🔍</Text>,
                  <TextInput
                    key="mti"
                    style={[st.searchInput, { color: colors.foreground }]}
                    placeholder="Type a state name…"
                    placeholderTextColor={colors.muted}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                  />,
                  search.length > 0 ? (
                    <Pressable key="mx" onPress={() => setSearch("")}>
                      <Text style={{ color: colors.muted }}>✕</Text>
                    </Pressable>
                  ) : null,
                ]}
              </View>,
              <ScrollView key="msv" style={st.listScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {filtered.length === 0 ? (
                  <View style={st.empty}>
                    {[
                      <Text key="me" style={{ color: colors.muted, fontSize: 14 }}>
                        {`No states match "${search}"`}
                      </Text>,
                    ]}
                  </View>
                ) : (
                  filtered.map((item) => {
                    const active = item.abbr === value;
                    return (
                      <Pressable
                        key={item.abbr}
                        onPress={() => {
                          onSelect(item.abbr);
                          setOpen(false);
                        }}
                        style={({ pressed }) => [
                          st.option,
                          active && { backgroundColor: colors.primary + "18" },
                          pressed && { backgroundColor: colors.primary + "0D" },
                        ]}
                      >
                        {[
                          <Text key="on" style={[st.optionName, { color: active ? colors.primary : colors.foreground }]}>
                            {item.name}
                          </Text>,
                          <Text key="oa" style={[st.optionAbbr, { color: colors.muted }]}>{item.abbr}</Text>,
                        ]}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>,
            ]}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 6 },
  webSearchCol: { flex: 1, minWidth: 0 },
  webSelectWrap: { marginTop: 8, width: "100%" as const },
  searchIcon: { marginRight: 8 },
  trigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  triggerText: { fontSize: 14, fontWeight: "500" },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  clearBtnSpaced: { marginLeft: 8 },
  clearAlign: { alignSelf: "center" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", padding: 18, paddingBottom: 8 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },

  listScroll: { maxHeight: 360 },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  optionName: { fontSize: 15, fontWeight: "500" },
  optionAbbr: { fontSize: 13, fontWeight: "600" },
  empty: { padding: 24, alignItems: "center" },
});
