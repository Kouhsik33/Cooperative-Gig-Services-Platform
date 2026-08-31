import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WorkerHomeScreen from "../screens/worker/WorkerHomeScreen";
import JobFeedScreen from "../screens/worker/JobFeedScreen";
import JobDetailScreen from "../screens/worker/JobDetailScreen";
import EarningsScreen from "../screens/worker/EarningsScreen";
import MyWelfareScreen from "../screens/worker/MyWelfareScreen";
import WorkerProfileScreen from "../screens/worker/WorkerProfileScreen";
import ChatScreen from "../screens/shared/ChatScreen";
import BottomTabs from "./BottomTabs";
import { screenOptions } from "./stackStyle";

// Worker journey per Part B, restructured onto a bottom-tab shell
// (master prompt §22: Home / Jobs / Earnings / Welfare / Profile).
// Home and Jobs each get their own stack so a job card can drill into
// JobDetailScreen (the whole OTP-gated lifecycle — product-flow update
// §17-21) and Chat from either tab. OnboardingStatusScreen is handled
// one level up, in RootNavigator, before a worker ever reaches these tabs.

export type HomeStackParamList = {
  WorkerHome: undefined;
  JobDetail: { bookingId: string };
  Chat: { bookingId: string; otherPartyName: string };
};

export type JobsStackParamList = {
  JobFeed: undefined;
  JobDetail: { bookingId: string };
  Chat: { bookingId: string; otherPartyName: string };
};

// Re-exported so JobDetailScreen/ChatScreen can share one prop type
// regardless of which stack (Home or Jobs) rendered them.
export type WorkerStackParamList = HomeStackParamList & JobsStackParamList;

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="WorkerHome" component={WorkerHomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job Details" }} />
      <HomeStack.Screen name="Chat" component={ChatScreen} options={{ title: "" }} />
    </HomeStack.Navigator>
  );
}

const JobsStack = createNativeStackNavigator<JobsStackParamList>();
function JobsStackNavigator() {
  return (
    <JobsStack.Navigator screenOptions={screenOptions}>
      <JobsStack.Screen name="JobFeed" component={JobFeedScreen} options={{ headerShown: false }} />
      <JobsStack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job Details" }} />
      <JobsStack.Screen name="Chat" component={ChatScreen} options={{ title: "" }} />
    </JobsStack.Navigator>
  );
}

export default function WorkerNavigator() {
  return (
    <BottomTabs
      tabs={[
        { key: "home", label: "Home", icon: "home", Screen: HomeStackNavigator },
        { key: "jobs", label: "Jobs", icon: "briefcase", Screen: JobsStackNavigator },
        { key: "earnings", label: "Earnings", icon: "cash", Screen: EarningsScreen },
        { key: "welfare", label: "Welfare", icon: "shield-checkmark", Screen: MyWelfareScreen },
        { key: "profile", label: "Profile", icon: "person", Screen: WorkerProfileScreen },
      ]}
    />
  );
}
