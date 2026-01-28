import React, { useState, useRef, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  FormControl,
  WarningOutlineIcon,
  useToast,
  Spinner,
  Center,
  Heading,
  Icon,
  Pressable,
  useColorMode
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LoginCredentials, RegisterData } from '../types';

export default function AuthScreen() {
  const { colorMode } = useColorMode();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    gender: 'male' as 'male' | 'female',
    units: 'metric' as 'metric' | 'imperial',
    language: 'en' as 'en' | 'tr'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  // Optimize onChangeText handlers with useCallback
  const handleEmailChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, email: text }));
  }, []);
  
  const handlePasswordChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, password: text }));
  }, []);
  
  const handleConfirmPasswordChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, confirmPassword: text }));
  }, []);

  const { login, register } = useAuth();
  const toast = useToast();
  const pageBg = colorMode === 'dark' ? 'gray.900' : 'gray.50';
  const textSecondary = colorMode === 'dark' ? 'gray.300' : 'gray.600';
  const inputBg = colorMode === 'dark' ? 'gray.800' : 'white';
  const inputText = colorMode === 'dark' ? 'gray.100' : 'gray.800';
  const inputPlaceholder = colorMode === 'dark' ? 'gray.400' : 'gray.500';
  const inputBorder = colorMode === 'dark' ? 'gray.600' : 'gray.300';
  
  // Create input styles
  const inputStyle = {
    backgroundColor: colorMode === 'dark' ? '#1F2937' : '#FFFFFF',
    color: colorMode === 'dark' ? '#F3F4F6' : '#1F2937',
    padding: 12,
    fontSize: 16,
    minHeight: 40,
  };
  
  const getBorderColor = (inputName: string, hasError: boolean) => {
    if (hasError) return '#EF4444'; // error.500
    if (focusedInput === inputName) return '#3B82F6'; // primary.500
    return colorMode === 'dark' ? '#4B5563' : '#D1D5DB';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        const credentials: LoginCredentials = {
          email: formData.email,
          password: formData.password
        };
        await login(credentials);
      } else {
        const registerData: RegisterData = {
          email: formData.email,
          password: formData.password,
          profile: {
            gender: formData.gender,
            units: formData.units,
            language: formData.language
          }
        };
        await register(registerData);
      }
    } catch (error: any) {
      toast.show({
        title: 'Error',
        description: error.message || 'Authentication failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData(prev => ({
      ...prev,
      password: '',
      confirmPassword: ''
    }));
  };

  return (
    <Box flex={1} bg={pageBg} safeArea>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <Box flex={1} px={6} py={4} justifyContent="center">
          <VStack space={6} w="100%" maxW="400px" mx="auto">
            {/* Header */}
            <VStack space={2} alignItems="center">
            <Icon as={Ionicons} name="fitness" size="4xl" color="primary.500" />
            <Heading size="xl" color="primary.500">
              IronEcho
            </Heading>
            <Text fontSize="md" color={textSecondary} textAlign="center">
              Your personal fitness tracker
            </Text>
          </VStack>

          {/* Form */}
          <VStack space={4}>
            {/* Email */}
            <FormControl isInvalid={!!errors.email}>
              <FormControl.Label>Email</FormControl.Label>
              <Box
                borderWidth={focusedInput === 'email' ? 2 : 1}
                borderRadius={6}
                borderColor={getBorderColor('email', !!errors.email)}
                bg={inputBg}
              >
                <TextInput
                  style={[
                    inputStyle,
                    { borderWidth: 0, outlineStyle: 'none' } // Remove border from TextInput, use Box border
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={inputPlaceholder}
                  value={formData.email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  editable={true}
                  selectTextOnFocus={false}
                  autoFocus={false}
                  clearButtonMode="while-editing"
                  onFocus={(e) => {
                    setFocusedInput('email');
                    // Prevent ScrollView from interfering
                    e.stopPropagation();
                  }}
                  onBlur={() => {
                    setFocusedInput(null);
                  }}
                  onSelectionChange={() => {
                    // Keep focus
                  }}
                />
              </Box>
              {errors.email && (
                <FormControl.ErrorMessage leftIcon={<WarningOutlineIcon size="xs" />}>
                  {errors.email}
                </FormControl.ErrorMessage>
              )}
            </FormControl>

            {/* Password */}
            <FormControl isInvalid={!!errors.password}>
              <FormControl.Label>Password</FormControl.Label>
              <Box
                borderWidth={focusedInput === 'password' ? 2 : 1}
                borderRadius={6}
                borderColor={getBorderColor('password', !!errors.password)}
                bg={inputBg}
              >
                <TextInput
                  style={[
                    inputStyle,
                    { borderWidth: 0, outlineStyle: 'none' }
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={inputPlaceholder}
                  value={formData.password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry
                  textContentType="password"
                  editable={true}
                  selectTextOnFocus={false}
                  autoFocus={false}
                  returnKeyType={isLogin ? "done" : "next"}
                  blurOnSubmit={isLogin}
                  clearButtonMode="never"
                  onFocus={(e) => {
                    setFocusedInput('password');
                    e.stopPropagation();
                  }}
                  onBlur={() => {
                    setFocusedInput(null);
                  }}
                  onSelectionChange={() => {
                    // Keep focus
                  }}
                />
              </Box>
              {errors.password && (
                <FormControl.ErrorMessage leftIcon={<WarningOutlineIcon size="xs" />}>
                  {errors.password}
                </FormControl.ErrorMessage>
              )}
            </FormControl>

            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <FormControl isInvalid={!!errors.confirmPassword}>
                <FormControl.Label>Confirm Password</FormControl.Label>
                <Box
                  borderWidth={focusedInput === 'confirmPassword' ? 2 : 1}
                  borderRadius={6}
                  borderColor={getBorderColor('confirmPassword', !!errors.confirmPassword)}
                  bg={inputBg}
                >
                  <TextInput
                    style={[
                      inputStyle,
                      { borderWidth: 0, outlineStyle: 'none' }
                    ]}
                    placeholder="Confirm your password"
                    placeholderTextColor={inputPlaceholder}
                    value={formData.confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    secureTextEntry
                    textContentType="password"
                    editable={true}
                    selectTextOnFocus={false}
                    autoFocus={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    clearButtonMode="never"
                    onFocus={(e) => {
                      setFocusedInput('confirmPassword');
                      e.stopPropagation();
                    }}
                    onBlur={() => {
                      setFocusedInput(null);
                    }}
                    onSelectionChange={() => {
                      // Keep focus
                    }}
                  />
                </Box>
                {errors.confirmPassword && (
                  <FormControl.ErrorMessage leftIcon={<WarningOutlineIcon size="xs" />}>
                    {errors.confirmPassword}
                  </FormControl.ErrorMessage>
                )}
              </FormControl>
            )}

            {/* Gender (Register only) */}
            {!isLogin && (
              <FormControl>
                <FormControl.Label>Gender</FormControl.Label>
                <HStack space={4}>
                  <Pressable
                    flex={1}
                    onPress={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                  >
                    <Box
                      p={3}
                      borderRadius="md"
                      bg={formData.gender === 'male'
                        ? (colorMode === 'dark' ? 'primary.900' : 'primary.100')
                        : (colorMode === 'dark' ? 'gray.700' : 'gray.100')}
                      borderWidth={1}
                      borderColor={formData.gender === 'male' ? 'primary.500' : inputBorder}
                    >
                      <Text textAlign="center" color={formData.gender === 'male' ? 'primary.400' : textSecondary}>
                        Male
                      </Text>
                    </Box>
                  </Pressable>
                  <Pressable
                    flex={1}
                    onPress={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                  >
                    <Box
                      p={3}
                      borderRadius="md"
                      bg={formData.gender === 'female'
                        ? (colorMode === 'dark' ? 'primary.900' : 'primary.100')
                        : (colorMode === 'dark' ? 'gray.700' : 'gray.100')}
                      borderWidth={1}
                      borderColor={formData.gender === 'female' ? 'primary.500' : inputBorder}
                    >
                      <Text textAlign="center" color={formData.gender === 'female' ? 'primary.400' : textSecondary}>
                        Female
                      </Text>
                    </Box>
                  </Pressable>
                </HStack>
              </FormControl>
            )}

            {/* Units (Register only) */}
            {!isLogin && (
              <FormControl>
                <FormControl.Label>Units</FormControl.Label>
                <HStack space={4}>
                  <Pressable
                    flex={1}
                    onPress={() => setFormData(prev => ({ ...prev, units: 'metric' }))}
                  >
                    <Box
                      p={3}
                      borderRadius="md"
                      bg={formData.units === 'metric'
                        ? (colorMode === 'dark' ? 'primary.900' : 'primary.100')
                        : (colorMode === 'dark' ? 'gray.700' : 'gray.100')}
                      borderWidth={1}
                      borderColor={formData.units === 'metric' ? 'primary.500' : inputBorder}
                    >
                      <Text textAlign="center" color={formData.units === 'metric' ? 'primary.400' : textSecondary}>
                        Metric (kg, cm)
                      </Text>
                    </Box>
                  </Pressable>
                  <Pressable
                    flex={1}
                    onPress={() => setFormData(prev => ({ ...prev, units: 'imperial' }))}
                  >
                    <Box
                      p={3}
                      borderRadius="md"
                      bg={formData.units === 'imperial'
                        ? (colorMode === 'dark' ? 'primary.900' : 'primary.100')
                        : (colorMode === 'dark' ? 'gray.700' : 'gray.100')}
                      borderWidth={1}
                      borderColor={formData.units === 'imperial' ? 'primary.500' : inputBorder}
                    >
                      <Text textAlign="center" color={formData.units === 'imperial' ? 'primary.400' : textSecondary}>
                        Imperial (lbs, in)
                      </Text>
                    </Box>
                  </Pressable>
                </HStack>
              </FormControl>
            )}

            {/* Submit Button */}
            <Button
              onPress={handleSubmit}
              isLoading={isLoading}
              isLoadingText={isLogin ? 'Signing in...' : 'Creating account...'}
              size="lg"
              colorScheme="primary"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>

            {/* Toggle Mode */}
            <Pressable onPress={toggleMode}>
              <Text textAlign="center" color="primary.500" fontSize="sm">
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </Text>
            </Pressable>
          </VStack>
        </VStack>
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
}
