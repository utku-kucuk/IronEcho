import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Center,
  Heading,
  Icon,
  Pressable,
  ScrollView
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState({
    gender: 'male' as 'male' | 'female',
    units: 'metric' as 'metric' | 'imperial',
    language: 'en' as 'en' | 'tr'
  });

  const { updateUser } = useAuth();
  const toast = useToast();

  const steps = [
    {
      title: 'Welcome to IronEcho!',
      subtitle: 'Let\'s set up your profile to get started',
      icon: 'person-add' as keyof typeof Ionicons.glyphMap
    },
    {
      title: 'Choose Your Gender',
      subtitle: 'This helps us provide better workout recommendations',
      icon: 'body' as keyof typeof Ionicons.glyphMap
    },
    {
      title: 'Select Your Units',
      subtitle: 'Choose between metric or imperial measurements',
      icon: 'scale' as keyof typeof Ionicons.glyphMap
    },
    {
      title: 'Pick Your Language',
      subtitle: 'Choose your preferred language',
      icon: 'language' as keyof typeof Ionicons.glyphMap
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      updateUser({
        profile: {
          gender: profile.gender,
          units: profile.units,
          language: profile.language
        }
      });

      toast.show({
        title: 'Welcome!',
        description: 'Your profile has been set up successfully',
      });
    } catch (error) {
      toast.show({
        title: 'Error',
        description: 'Failed to complete setup',
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <VStack space={6} alignItems="center">
            <Icon as={Ionicons} name="fitness" size="6xl" color="primary.500" />
            <VStack space={2} alignItems="center">
              <Heading size="xl" textAlign="center">
                {steps[currentStep].title}
              </Heading>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                {steps[currentStep].subtitle}
              </Text>
            </VStack>
            <Text fontSize="md" color="gray.500" textAlign="center" px={4}>
              IronEcho is your personal fitness companion that works 100% offline. 
              Track workouts, monitor progress, and achieve your fitness goals.
            </Text>
          </VStack>
        );

      case 1:
        return (
          <VStack space={6} alignItems="center">
            <Icon as={Ionicons} name={steps[currentStep].icon as any} size="4xl" color="primary.500" />
            <VStack space={2} alignItems="center">
              <Heading size="xl" textAlign="center">
                {steps[currentStep].title}
              </Heading>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                {steps[currentStep].subtitle}
              </Text>
            </VStack>
            <VStack space={4} w="100%">
              <Pressable
                onPress={() => setProfile(prev => ({ ...prev, gender: 'male' }))}
              >
                <Box
                  p={6}
                  borderRadius="xl"
                  bg={profile.gender === 'male' ? 'primary.100' : 'gray.100'}
                  borderWidth={2}
                  borderColor={profile.gender === 'male' ? 'primary.500' : 'gray.300'}
                >
                  <HStack space={4} alignItems="center">
                    <Icon 
                      as={Ionicons} 
                      name="male" 
                      size="2xl" 
                      color={profile.gender === 'male' ? 'primary.600' : 'gray.600'} 
                    />
                    <VStack flex={1}>
                      <Text fontSize="lg" fontWeight="bold" color={profile.gender === 'male' ? 'primary.600' : 'gray.600'}>
                        Male
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Recommended progression: 5-10% weight increase
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </Pressable>

              <Pressable
                onPress={() => setProfile(prev => ({ ...prev, gender: 'female' }))}
              >
                <Box
                  p={6}
                  borderRadius="xl"
                  bg={profile.gender === 'female' ? 'primary.100' : 'gray.100'}
                  borderWidth={2}
                  borderColor={profile.gender === 'female' ? 'primary.500' : 'gray.300'}
                >
                  <HStack space={4} alignItems="center">
                    <Icon 
                      as={Ionicons} 
                      name="female" 
                      size="2xl" 
                      color={profile.gender === 'female' ? 'primary.600' : 'gray.600'} 
                    />
                    <VStack flex={1}>
                      <Text fontSize="lg" fontWeight="bold" color={profile.gender === 'female' ? 'primary.600' : 'gray.600'}>
                        Female
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Recommended progression: 3-5% weight increase (safer recovery)
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </Pressable>
            </VStack>
          </VStack>
        );

      case 2:
        return (
          <VStack space={6} alignItems="center">
            <Icon as={Ionicons} name={steps[currentStep].icon as any} size="4xl" color="primary.500" />
            <VStack space={2} alignItems="center">
              <Heading size="xl" textAlign="center">
                {steps[currentStep].title}
              </Heading>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                {steps[currentStep].subtitle}
              </Text>
            </VStack>
            <VStack space={4} w="100%">
              <Pressable
                onPress={() => setProfile(prev => ({ ...prev, units: 'metric' }))}
              >
                <Box
                  p={6}
                  borderRadius="xl"
                  bg={profile.units === 'metric' ? 'primary.100' : 'gray.100'}
                  borderWidth={2}
                  borderColor={profile.units === 'metric' ? 'primary.500' : 'gray.300'}
                >
                  <HStack space={4} alignItems="center">
                    <Icon 
                      as={Ionicons} 
                      name="globe" 
                      size="2xl" 
                      color={profile.units === 'metric' ? 'primary.600' : 'gray.600'} 
                    />
                    <VStack flex={1}>
                      <Text fontSize="lg" fontWeight="bold" color={profile.units === 'metric' ? 'primary.600' : 'gray.600'}>
                        Metric
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Kilograms (kg), Centimeters (cm)
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </Pressable>

              <Pressable
                onPress={() => setProfile(prev => ({ ...prev, units: 'imperial' }))}
              >
                <Box
                  p={6}
                  borderRadius="xl"
                  bg={profile.units === 'imperial' ? 'primary.100' : 'gray.100'}
                  borderWidth={2}
                  borderColor={profile.units === 'imperial' ? 'primary.500' : 'gray.300'}
                >
                  <HStack space={4} alignItems="center">
                    <Icon 
                      as={Ionicons} 
                      name="flag" 
                      size="2xl" 
                      color={profile.units === 'imperial' ? 'primary.600' : 'gray.600'} 
                    />
                    <VStack flex={1}>
                      <Text fontSize="lg" fontWeight="bold" color={profile.units === 'imperial' ? 'primary.600' : 'gray.600'}>
                        Imperial
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Pounds (lbs), Inches (in)
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </Pressable>
            </VStack>
          </VStack>
        );

      case 3:
        return (
          <VStack space={6} alignItems="center">
            <Icon as={Ionicons} name={steps[currentStep].icon as any} size="4xl" color="primary.500" />
            <VStack space={2} alignItems="center">
              <Heading size="xl" textAlign="center">
                {steps[currentStep].title}
              </Heading>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                {steps[currentStep].subtitle}
              </Text>
            </VStack>
            <VStack space={4} w="100%">
              <Pressable
                onPress={() => setProfile(prev => ({ ...prev, language: 'en' }))}
              >
                <Box
                  p={6}
                  borderRadius="xl"
                  bg={profile.language === 'en' ? 'primary.100' : 'gray.100'}
                  borderWidth={2}
                  borderColor={profile.language === 'en' ? 'primary.500' : 'gray.300'}
                >
                  <HStack space={4} alignItems="center">
                    <Text fontSize="2xl">🇺🇸</Text>
                    <VStack flex={1}>
                      <Text fontSize="lg" fontWeight="bold" color={profile.language === 'en' ? 'primary.600' : 'gray.600'}>
                        English
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        English language interface
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </Pressable>

              <Pressable
                onPress={() => setProfile(prev => ({ ...prev, language: 'tr' }))}
              >
                <Box
                  p={6}
                  borderRadius="xl"
                  bg={profile.language === 'tr' ? 'primary.100' : 'gray.100'}
                  borderWidth={2}
                  borderColor={profile.language === 'tr' ? 'primary.500' : 'gray.300'}
                >
                  <HStack space={4} alignItems="center">
                    <Text fontSize="2xl">🇹🇷</Text>
                    <VStack flex={1}>
                      <Text fontSize="lg" fontWeight="bold" color={profile.language === 'tr' ? 'primary.600' : 'gray.600'}>
                        Türkçe
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Türkçe arayüz
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </Pressable>
            </VStack>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <ScrollView flex={1} contentContainerStyle={{ flexGrow: 1 }}>
        <VStack flex={1} px={6} py={8}>
          {/* Progress Indicator */}
          <HStack space={2} justifyContent="center" mb={8}>
            {steps.map((_, index) => (
              <Box
                key={index}
                w={3}
                h={3}
                borderRadius="full"
                bg={index <= currentStep ? 'primary.500' : 'gray.300'}
              />
            ))}
          </HStack>

          {/* Step Content */}
          <Center flex={1}>
            {renderStepContent()}
          </Center>

          {/* Navigation Buttons */}
          <HStack space={4} mt={8}>
            {currentStep > 0 && (
              <Button
                flex={1}
                variant="outline"
                onPress={handleBack}
                colorScheme="primary"
              >
                Back
              </Button>
            )}
            <Button
              flex={1}
              onPress={handleNext}
              colorScheme="primary"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </HStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}
