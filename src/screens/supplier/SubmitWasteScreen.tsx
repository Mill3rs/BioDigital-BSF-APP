import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, StatusBar, Platform,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { wasteAPI } from '../../api/waste';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../utils/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SupplierStackParamList } from '../../navigation/SupplierNavigator';

type Props = NativeStackScreenProps<SupplierStackParamList, 'SubmitWaste'>;

const SOURCE_TYPES = [
  { key: 'FOOD_WASTE',   label: 'Food Waste',   emoji: '🍎' },
  { key: 'AGRICULTURAL', label: 'Agricultural', emoji: '🌾' },
  { key: 'MARKET_WASTE', label: 'Market Waste', emoji: '🛒' },
  { key: 'BREWERY',      label: 'Brewery',      emoji: '🍺' },
  { key: 'HOUSEHOLD',    label: 'Household',    emoji: '🏠' },
  { key: 'INDUSTRIAL',   label: 'Industrial',   emoji: '🏭' },
  { key: 'OTHER',        label: 'Other',        emoji: '♻️' },
];

const SUB_TYPES: Record<string, { key: string; label: string; emoji: string }[]> = {
  FOOD_WASTE: [
    { key: 'restaurant_scraps',    label: 'Restaurant Scraps',    emoji: '🍽️' },
    { key: 'cooked_food',          label: 'Cooked Food',          emoji: '🥘' },
    { key: 'bread_bakery',         label: 'Bread / Bakery',       emoji: '🍞' },
    { key: 'dairy',                label: 'Dairy Products',       emoji: '🥛' },
    { key: 'meat_fish',            label: 'Meat / Fish',          emoji: '🐟' },
    { key: 'fruit_peels',          label: 'Fruit Peels',          emoji: '🍊' },
    { key: 'vegetable_trimmings',  label: 'Vegetable Trimmings',  emoji: '🥦' },
    { key: 'expired_food',         label: 'Expired Food',         emoji: '⏰' },
  ],
  AGRICULTURAL: [
    { key: 'banana',               label: 'Banana Peels / Stems', emoji: '🍌' },
    { key: 'watermelon',           label: 'Watermelon Rinds',     emoji: '🍉' },
    { key: 'cassava',              label: 'Cassava Peels',        emoji: '🌿' },
    { key: 'yam',                  label: 'Yam Peels',            emoji: '🍠' },
    { key: 'maize',                label: 'Maize Stalks / Husks', emoji: '🌽' },
    { key: 'cocoa',                label: 'Cocoa Pods',           emoji: '🍫' },
    { key: 'plantain',             label: 'Plantain Peels',       emoji: '🌿' },
    { key: 'tomato',               label: 'Tomato Waste',         emoji: '🍅' },
    { key: 'rice',                 label: 'Rice Husks / Straw',   emoji: '🌾' },
    { key: 'sugarcane',            label: 'Sugarcane Bagasse',    emoji: '🎋' },
    { key: 'palm',                 label: 'Palm Fruit Waste',     emoji: '🌴' },
  ],
  MARKET_WASTE: [
    { key: 'mixed_vegetable',      label: 'Mixed Vegetables',     emoji: '🥬' },
    { key: 'mixed_fruit',          label: 'Mixed Fruits',         emoji: '🍇' },
    { key: 'fish_market',          label: 'Fish Waste',           emoji: '🐠' },
    { key: 'grain_waste',          label: 'Grain Waste',          emoji: '🌾' },
    { key: 'meat_offal',           label: 'Meat / Offal',         emoji: '🥩' },
    { key: 'mixed_market',         label: 'Mixed Market Waste',   emoji: '🛒' },
  ],
  BREWERY: [
    { key: 'spent_grain',          label: 'Spent Grain',          emoji: '🫙' },
    { key: 'yeast_waste',          label: 'Yeast Waste',          emoji: '🧫' },
    { key: 'fruit_pomace',         label: 'Fruit Pomace',         emoji: '🍷' },
    { key: 'molasses',             label: 'Molasses Waste',       emoji: '🫗' },
    { key: 'distillery_slops',     label: 'Distillery Slops',     emoji: '🥃' },
  ],
  HOUSEHOLD: [
    { key: 'kitchen_scraps',       label: 'Kitchen Scraps',       emoji: '🍴' },
    { key: 'garden_waste',         label: 'Garden / Yard Waste',  emoji: '🌱' },
    { key: 'fruit_veg_peels',      label: 'Fruit & Veg Peels',    emoji: '🥕' },
    { key: 'leftover_food',        label: 'Leftover Food',        emoji: '🥡' },
  ],
  INDUSTRIAL: [
    { key: 'food_processing',      label: 'Food Processing Waste',     emoji: '🏭' },
    { key: 'slaughterhouse',       label: 'Slaughterhouse Waste',      emoji: '🐄' },
    { key: 'paper_cardboard',      label: 'Paper / Cardboard',         emoji: '📦' },
    { key: 'cannery_waste',        label: 'Cannery / Canning Waste',   emoji: '🥫' },
  ],
  OTHER: [
    { key: 'mixed_organic',        label: 'Mixed Organic Waste',  emoji: '♻️' },
    { key: 'unspecified',          label: 'Unspecified',          emoji: '❓' },
  ],
};

const UNITS = ['kg', 'tons', 'litres', 'crates', 'sacks'];

export default function SubmitWasteScreen({ navigation }: Readonly<Props>) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    sourceName:    '',
    sourceType:    'FOOD_WASTE',
    sourceSubType: '',
    quantity:      '',
    unit:          'kg',
    notes:         '',
  });
  const [pickedDate, setPickedDate] = useState<Date>(new Date());
  const [pickedTime, setPickedTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState<{
    lat?: number; lng?: number; address?: string;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [atPickupLocation, setAtPickupLocation] = useState(false);

  const set = (key: string) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const captureGPS = (silent = false) => {
    setGpsLoading(true);
    Geolocation.getCurrentPosition(
      pos => {
        setLocation(prev => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setGpsLoading(false);
      },
      () => {
        if (silent) {
          // Auto-capture failed — uncheck so the manual field reappears
          setAtPickupLocation(false);
          Alert.alert('Location Unavailable', 'Could not detect your current location. Please enter the address manually.');
        } else {
          Alert.alert('GPS Error', 'Could not get your location. Please enter the address manually.');
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  };

  const handleAtPickupToggle = () => {
    const next = !atPickupLocation;
    setAtPickupLocation(next);
    if (next) {
      // Clear any manual address and auto-grab GPS
      setLocation(null);
      captureGPS(true);
    } else {
      // Clear GPS coords so the manual field is fresh
      setLocation(null);
    }
  };

  const handleNext = () => {
    if (atPickupLocation && !location?.lat) {
      Alert.alert('Location Pending', 'Your GPS location is still being captured. Please wait or tap Retry.');
      return;
    }
    if (!atPickupLocation && !form.sourceName.trim()) {
      Alert.alert('Required', 'Please enter a pickup location or source name.');
      return;
    }
    if (!form.quantity.trim() || Number.isNaN(Number(form.quantity)) || Number(form.quantity) <= 0) {
      Alert.alert('Required', 'Please enter a valid quantity.');
      return;
    }
    setStep(2);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const isoDate = pickedDate.toISOString().split('T')[0];
      const subLabel = SUB_TYPES[form.sourceType]?.find(s => s.key === form.sourceSubType)?.label;
      const resolvedName = form.sourceName.trim() || location?.address || 'My Location';
      await wasteAPI.create({
        sourceName:  resolvedName,
        sourceType:  form.sourceType as any,
        quantity:    Number(form.quantity),
        unit:        form.unit,
        date:        isoDate,
        description: subLabel ? `${form.sourceType} — ${subLabel}` : form.sourceType,
        notes:       form.notes.trim() || undefined,
        location:    (location?.lat || location?.address)
          ? { lat: location?.lat, lng: location?.lng, address: location?.address }
          : undefined,
      });
      Alert.alert(
        'Request Submitted! 🎉',
        'Your pickup request has been submitted. A driver will be assigned shortly.',
        [{
          text: 'Done', onPress: () => {
            setStep(1);
            setForm({ sourceName: '', sourceType: 'FOOD_WASTE', sourceSubType: '', quantity: '', unit: 'kg', notes: '' });
            setPickedDate(new Date());
            setPickedTime(new Date());
            setLocation(null);
            setAtPickupLocation(false);
            (navigation as any).navigate('WasteListTab');
          },
        }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8F5" />

      {/* Step indicator */}
      <View style={styles.stepBar}>
        <View style={styles.stepTrack}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabelText, styles.stepLabelActive]}>Waste Details</Text>
          <Text style={[styles.stepLabelText, step === 2 && styles.stepLabelActive]}>Pickup Info</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {step === 1 ? (
          <>
            {/* Waste Type */}
            <Text style={styles.fieldLabel}>Waste Type</Text>
            <View style={styles.typeList}>
              {SOURCE_TYPES.map((t, index) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeListItem,
                    form.sourceType === t.key && styles.typeListItemActive,
                    index === SOURCE_TYPES.length - 1 && styles.typeListItemLast,
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, sourceType: t.key, sourceSubType: '' }))}>
                  <View style={styles.typeListLeft}>
                    <Text style={styles.typeEmoji}>{t.emoji}</Text>
                    <Text style={[styles.typeListLabel, form.sourceType === t.key && styles.typeListLabelActive]}>
                      {t.label}
                    </Text>
                  </View>
                  <View style={[styles.radioOuter, form.sourceType === t.key && styles.radioOuterActive]}>
                    {form.sourceType === t.key && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sub-type */}
            {SUB_TYPES[form.sourceType] && (
              <>
                <Text style={styles.fieldLabel}>Specify Waste Item</Text>
                <View style={styles.typeList}>
                  {SUB_TYPES[form.sourceType].map((s, index) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[
                        styles.typeListItem,
                        form.sourceSubType === s.key && styles.typeListItemActive,
                        index === SUB_TYPES[form.sourceType].length - 1 && styles.typeListItemLast,
                      ]}
                      onPress={() => setForm(prev => ({ ...prev, sourceSubType: s.key }))}>
                      <View style={styles.typeListLeft}>
                        <Text style={styles.typeEmoji}>{s.emoji}</Text>
                        <Text style={[styles.typeListLabel, form.sourceSubType === s.key && styles.typeListLabelActive]}>
                          {s.label}
                        </Text>
                      </View>
                      <View style={[styles.radioOuter, form.sourceSubType === s.key && styles.radioOuterActive]}>
                        {form.sourceSubType === s.key && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Pickup Location */}
            <Text style={styles.fieldLabel}>Pickup Location / Source Name</Text>

            {/* Checkbox — I am at the pickup location */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={handleAtPickupToggle}
              activeOpacity={0.7}>
              <View style={[styles.checkbox, atPickupLocation && styles.checkboxChecked]}>
                {atPickupLocation && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkboxLabel}>I am at the pickup location</Text>
                <Text style={styles.checkboxHint}>Tap to auto-capture your GPS coordinates</Text>
              </View>
            </TouchableOpacity>

            {/* When checked: show GPS capture status */}
            {atPickupLocation && (
              <View style={styles.gpsBanner}>
                {gpsLoading && (
                  <>
                    <ActivityIndicator color={Colors.primary} size="small" />
                    <Text style={styles.gpsBannerText}>Detecting your location…</Text>
                  </>
                )}
                {!gpsLoading && location?.lat && (
                  <>
                    <Text style={styles.gpsBannerIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gpsBannerTitle}>Location Captured</Text>
                      <Text style={styles.gpsBannerCoords}>
                        {location.lat.toFixed(5)}, {location.lng?.toFixed(5)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => captureGPS(true)}>
                      <Text style={styles.gpsBannerRefresh}>↺ Refresh</Text>
                    </TouchableOpacity>
                  </>
                )}
                {!gpsLoading && !location?.lat && (
                  <>
                    <Text style={styles.gpsBannerIcon}>⚠️</Text>
                    <Text style={[styles.gpsBannerText, { color: '#B71C1C' }]}>
                      Could not detect location.{' '}
                      <Text style={{ textDecorationLine: 'underline' }} onPress={() => captureGPS(true)}>
                        Retry
                      </Text>
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* When NOT checked: manual text input */}
            {!atPickupLocation && (
              <View style={styles.inputRow}>
                <Text style={styles.inputAdornment}>📍</Text>
                <TextInput
                  style={styles.inputInner}
                  placeholder="e.g. Kumasi Central Market"
                  placeholderTextColor={Colors.textSecondary}
                  value={form.sourceName}
                  onChangeText={set('sourceName')}
                />
              </View>
            )}

            {/* Quantity + Unit */}
            <Text style={styles.fieldLabel}>Quantity</Text>
            <View style={styles.qtyContainer}>
              <View style={[styles.inputRow, { flex: 1 }]}>
                <Text style={styles.inputAdornment}>⚖️</Text>
                <TextInput
                  style={styles.inputInner}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                  value={form.quantity}
                  onChangeText={set('quantity')}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.unitScroll}
                contentContainerStyle={styles.unitScrollContent}>
                {UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, form.unit === u && styles.unitChipActive]}
                    onPress={() => setForm(prev => ({ ...prev, unit: u }))}>
                    <Text style={[styles.unitChipText, form.unit === u && styles.unitChipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Special Instructions */}
            <Text style={styles.fieldLabel}>
              Special Instructions{' '}
              <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Gate code, parking instructions, access notes..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
              value={form.notes}
              onChangeText={set('notes')}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
              <Text style={styles.primaryBtnText}>Next  →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Step 2 header */}
            <Text style={styles.sectionHeading}>Request Pickup</Text>
            <Text style={styles.sectionSubtitle}>Schedule a pickup for your organic waste</Text>

            {/* Date + Time */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.inputAdornment}>📅</Text>
                  <Text style={[styles.inputInner, styles.pickerText]}>
                    {pickedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ width: Spacing.sm }} />
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Time</Text>
                <TouchableOpacity style={styles.inputRow} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.inputAdornment}>🕐</Text>
                  <Text style={[styles.inputInner, styles.pickerText]}>
                    {pickedTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={pickedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setPickedDate(date);
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={pickedTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour
                onChange={(_: DateTimePickerEvent, time?: Date) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (time) setPickedTime(time);
                }}
              />
            )}

            {/* Info banners */}
            <View style={styles.infoBanner}>
              <Text style={styles.bannerIcon}>🚗</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoBannerTitle}>Driver Assignment</Text>
                <Text style={styles.infoBannerBody}>
                  A driver will be assigned within 15 minutes of your request
                </Text>
              </View>
            </View>

            <View style={styles.notifBanner}>
              <Text style={styles.bannerIcon}>ℹ️</Text>
              <Text style={styles.notifBannerBody}>
                You'll receive notifications about driver assignment and ETA
              </Text>
            </View>

            {/* Action row */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(1)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Request Pickup</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:             { flex: 1, backgroundColor: '#F7F8F5' },
  stepBar:            { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  stepTrack:          { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepDot:            { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  stepDotActive:      { backgroundColor: Colors.primary },
  stepLine:           { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLineActive:     { backgroundColor: Colors.primary },
  stepLabels:         { flexDirection: 'row', justifyContent: 'space-between' },
  stepLabelText:      { ...Typography.caption, color: Colors.textSecondary },
  stepLabelActive:    { color: Colors.primary, fontWeight: '600' },
  scroll:             { flex: 1 },
  content:            { paddingHorizontal: Spacing.md, paddingBottom: 48 },
  sectionHeading:     { ...Typography.h3, color: '#1a1a1a', marginTop: Spacing.sm },
  sectionSubtitle:    { ...Typography.body2, color: Colors.textSecondary, marginBottom: Spacing.md, marginTop: 2 },
  fieldLabel:         { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginTop: Spacing.md, marginBottom: 6 },
  optional:           { fontWeight: '400', color: Colors.textSecondary },
  typeList:           { backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm },
  typeListItem:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  typeListItemActive: { backgroundColor: Colors.primary + '0D' },
  typeListItemLast:   { borderBottomWidth: 0 },
  typeListLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeListLabel:      { ...Typography.body1, color: '#1a1a1a', fontWeight: '500' },
  typeListLabelActive:{ color: Colors.primary, fontWeight: '700' },
  radioOuter:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive:   { borderColor: Colors.primary },
  radioInner:         { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  typeGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: '#fff' },
  typeChipActive:     { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  typeEmoji:          { fontSize: 20 },
  typeChipText:       { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500' },
  typeChipTextActive: { color: Colors.primary, fontWeight: '700' },
  inputRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, ...Shadow.sm },
  inputAdornment:     { fontSize: 16, marginRight: 8 },
  inputInner:         { flex: 1, ...Typography.body1, color: '#1a1a1a', paddingVertical: 13 },
  qtyContainer:       { gap: 8 },
  unitScroll:         { maxHeight: 42 },
  unitScrollContent:  { gap: 6, alignItems: 'center' },
  unitChip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
  unitChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitChipText:       { ...Typography.caption, color: Colors.textSecondary },
  unitChipTextActive: { color: '#fff', fontWeight: '700' },
  textArea:           { backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, ...Typography.body1, color: '#1a1a1a', textAlignVertical: 'top', minHeight: 90, ...Shadow.sm },
  gpsBtn:             { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md, padding: 12, marginTop: 8, backgroundColor: Colors.primary + '0D' },
  gpsIcon:            { fontSize: 18 },
  gpsBtnText:         { ...Typography.body2, color: Colors.primary, fontWeight: '600' },
  checkboxRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginTop: Spacing.sm, ...Shadow.sm },
  checkbox:           { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: '#fff' },
  checkboxChecked:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark:          { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 15 },
  checkboxLabel:      { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  checkboxHint:       { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  gpsBanner:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F5E9', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '40', padding: Spacing.md, marginTop: 8 },
  gpsBannerIcon:      { fontSize: 20 },
  gpsBannerTitle:     { fontSize: 13, fontWeight: '700', color: '#1B5E20' },
  gpsBannerCoords:    { ...Typography.caption, color: '#2E7D32', fontFamily: 'monospace' },
  gpsBannerText:      { ...Typography.body2, color: Colors.primary, flex: 1 },
  gpsBannerRefresh:   { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  dateRow:            { flexDirection: 'row' },
  pickerText:         { paddingVertical: 13, color: '#1a1a1a' },
  dateField:          { flex: 1 },
  infoBanner:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#E8F5E9', borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  notifBanner:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFDE7', borderRadius: Radius.md, padding: Spacing.md, marginTop: 8 },
  bannerIcon:         { fontSize: 20 },
  infoBannerTitle:    { fontSize: 13, fontWeight: '700', color: '#1B5E20', marginBottom: 2 },
  infoBannerBody:     { ...Typography.caption, color: '#2E7D32' },
  notifBannerBody:    { ...Typography.caption, color: '#F57F17', flex: 1 },
  actionRow:          { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn:          { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
  cancelBtnText:      { ...Typography.button, color: Colors.textSecondary },
  submitBtn:          { flex: 2, backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  submitBtnText:      { ...Typography.button, color: '#fff' },
  primaryBtn:         { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  primaryBtnText:     { ...Typography.button, color: '#fff' },
});
