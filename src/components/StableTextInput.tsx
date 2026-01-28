import React, { memo, useRef } from 'react';
import { TextInput, Keyboard } from 'react-native';

interface StableTextInputProps {
  value: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  style?: any;
  placeholderTextColor?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onTouchStart?: (e: any) => void;
  onTouchEnd?: (e: any) => void;
  returnKeyType?: "done" | "next" | "search" | "send" | "none" | "previous" | "default" | "go" | "google" | "join" | "route" | "yahoo" | "emergency-call";
  blurOnSubmit?: boolean;
  onSubmitEditing?: () => void;
  keyboardType?: "default" | "numeric" | "email-address" | "ascii-capable" | "numbers-and-punctuation" | "url" | "number-pad" | "phone-pad" | "name-phone-pad" | "decimal-pad" | "twitter" | "web-search" | "visible-password";
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  textContentType?: string;
}

// Memoized TextInput component to prevent re-renders during typing
export const StableTextInput = memo(({ 
  value, 
  placeholder, 
  onChangeText, 
  style, 
  placeholderTextColor,
  onFocus,
  onBlur,
  onTouchStart,
  onTouchEnd,
  returnKeyType = "done",
  blurOnSubmit = true,
  onSubmitEditing,
  keyboardType = "default",
  multiline = false,
  numberOfLines,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
  textContentType
}: StableTextInputProps) => {
  const inputRef = useRef<TextInput>(null);
  
  return (
    <TextInput
      ref={inputRef}
      style={style}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      value={value}
      onChangeText={onChangeText}
      editable={true}
      selectTextOnFocus={false}
      autoFocus={false}
      returnKeyType={returnKeyType}
      blurOnSubmit={blurOnSubmit}
      onSubmitEditing={() => {
        if (onSubmitEditing) {
          onSubmitEditing();
        } else {
          Keyboard.dismiss();
        }
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      secureTextEntry={secureTextEntry}
      textContentType={textContentType}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if value or placeholder actually changed
  // Ignore onChangeText and other function props changes
  return prevProps.value === nextProps.value && 
         prevProps.placeholder === nextProps.placeholder;
});

StableTextInput.displayName = 'StableTextInput';

