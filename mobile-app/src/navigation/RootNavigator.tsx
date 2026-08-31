import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/auth/LoginScreen";
import OtpScreen from "../screens/auth/OtpScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OnboardingStatusScreen from "../screens/worker/OnboardingStatusScreen";
import CustomerNavigator from "./CustomerNavigator";
import WorkerNavigator from "./WorkerNavigator";
import { useAuth } from "../store/AuthContext";
import { LocationProvider } from "../store/LocationContext";
import { screenOptions } from "./stackStyle";

// Single Expo app, role-routed post-login (CUSTOMER / WORKER share this
// app). FEDERATION_ADMIN accounts use /admin-web instead — OtpScreen
// rejects that role after a successful code verification.
//
// Passwordless auth (product-flow update §36-38): Login collects a phone
// number, Otp verifies the code (backend-validated — see
// backend/src/services/otp.service.ts), and only routes to Register when
// the backend itself reports the phone has no account yet.

export type RootStackParamList = {
  Login: undefined;
  Otp: { phone: string };
  Register: { phone: string };
  CustomerApp: undefined;
  WorkerApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Stack.Navigator initialRouteName="Login" screenOptions={screenOptions}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Otp" component={OtpScreen} options={{ title: "Verify your number" }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Create account" }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user.role === "WORKER" ? (
        user.worker ? (
          <Stack.Screen name="WorkerApp" component={WorkerNavigator} />
        ) : (
          // A brand-new WORKER account has no Worker profile yet (skills/
          // society/certifications) — onboarding must come before the
          // normal Jobs/Earnings/Welfare tabs mean anything.
          <Stack.Screen name="WorkerApp" component={OnboardingStatusScreen} />
        )
      ) : (
        <Stack.Screen name="CustomerApp">
          {() => (
            <LocationProvider>
              <CustomerNavigator />
            </LocationProvider>
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
