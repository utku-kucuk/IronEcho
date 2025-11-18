import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

  const { login, register } = useAuth();
  const toast = useToast();
  const pageBg = colorMode === 'dark' ? 'gray.900' : 'gray.50';
  const textSecondary = colorMode === 'dark' ? 'gray.300' : 'gray.600';
  const inputBg = colorMode === 'dark' ? 'gray.800' : 'white';
  const inputText = colorMode === 'dark' ? 'gray.100' : 'gray.800';
  const inputPlaceholder = colorMode === 'dark' ? 'gray.400' : 'gray.500';
  const inputBorder = colorMode === 'dark' ? 'gray.600' : 'gray.300';

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'none' : 'on-drag'}
        >
      <Center flex={1} px={6}>
        <VStack space={6} w="100%" maxW="400px">
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
              <Input
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                bg={inputBg}
                color={inputText}
                placeholderTextColor={inputPlaceholder}
                borderColor={inputBorder}
                _focus={{ borderColor: 'primary.500' }}
              />
              <FormControl.ErrorMessage leftIcon={<WarningOutlineIcon size="xs" />}>
                {errors.email}
              </FormControl.ErrorMessage>
            </FormControl>

            {/* Password */}
            <FormControl isInvalid={!!errors.password}>
              <FormControl.Label>Password</FormControl.Label>
              <Input
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                secureTextEntry
                textContentType="password"
                bg={inputBg}
                color={inputText}
                placeholderTextColor={inputPlaceholder}
                borderColor={inputBorder}
                _focus={{ borderColor: 'primary.500' }}
              />
              <FormControl.ErrorMessage leftIcon={<WarningOutlineIcon size="xs" />}>
                {errors.password}
              </FormControl.ErrorMessage>
            </FormControl>

            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <FormControl isInvalid={!!errors.confirmPassword}>
                <FormControl.Label>Confirm Password</FormControl.Label>
                <Input
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                  secureTextEntry
                  textContentType="password"
                  bg={inputBg}
                  color={inputText}
                  placeholderTextColor={inputPlaceholder}
                  borderColor={inputBorder}
                  _focus={{ borderColor: 'primary.500' }}
                />
                <FormControl.ErrorMessage leftIcon={<WarningOutlineIcon size="xs" />}>
                  {errors.confirmPassword}
                </FormControl.ErrorMessage>
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
      </Center>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
