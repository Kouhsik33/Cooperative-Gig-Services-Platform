import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ServiceCatalogScreen from "../screens/customer/ServiceCatalogScreen";
import BookingSlotScreen from "../screens/customer/BookingSlotScreen";
import FairPricingBreakdownScreen from "../screens/customer/FairPricingBreakdownScreen";
import CheckoutScreen from "../screens/customer/CheckoutScreen";
import InvoiceScreen from "../screens/customer/InvoiceScreen";
import EmergencyBookingScreen from "../screens/customer/EmergencyBookingScreen";
import RatingScreen from "../screens/customer/RatingScreen";
import BookingsListScreen from "../screens/customer/BookingsListScreen";
import CustomerProfileScreen from "../screens/customer/CustomerProfileScreen";
import LocationPickerScreen from "../screens/customer/LocationPickerScreen";
import AddAddressScreen from "../screens/customer/AddAddressScreen";
import BookingTrackingScreen from "../screens/customer/BookingTrackingScreen";
import ChatScreen from "../screens/shared/ChatScreen";
import BottomTabs from "./BottomTabs";
import { screenOptions } from "./stackStyle";

// Customer journey per Part B, restructured onto a bottom-tab shell
// (master prompt §7: Home / Bookings / Emergency / Profile — "Welfare /
// Impact" is folded into the Home screen's trust strip instead of a
// fifth tab, since there is no customer-facing aggregate-welfare API to
// back it honestly). Each tab owns its own stack so the booking flow,
// the bookings list, and the emergency flow can each push their own
// screens without fighting over one shared history.
//
// LocationPicker/AddAddress/BookingTracking/Chat (product-flow update
// §5-9, §17-23) are registered in every stack that can reach them,
// reusing the same components — the same pattern already used for
// FairPricingBreakdown/Checkout/Invoice/Rating below.
//
// No WorkerSearch route (dispatch model update §8): the customer books
// a SERVICE, never a specific worker — that whole screen/step is gone
// from this navigator on purpose, not just unused.

type SharedRoutes = {
  FairPricingBreakdown: {
    serviceId: string;
    scheduledAt: string;
    latitude: number;
    longitude: number;
    isEmergency?: boolean;
    serviceAddressLine?: string;
    serviceLandmark?: string;
    servicePincode?: string;
    contactName?: string;
    contactPhone?: string;
    instructions?: string;
  };
  Checkout: { bookingId: string };
  Invoice: { bookingId: string };
  Rating: { bookingId: string };
  BookingTracking: { bookingId: string };
  Chat: { bookingId: string; otherPartyName: string };
  LocationPicker: undefined;
  AddAddress: undefined;
};

export type HomeStackParamList = SharedRoutes & {
  ServiceCatalog: undefined;
  BookingSlot: { serviceId: string; serviceName: string };
};

export type BookingsStackParamList = SharedRoutes & {
  BookingsList: undefined;
};

export type EmergencyStackParamList = SharedRoutes & {
  EmergencyBooking: undefined;
};

function sharedScreens<T extends Record<string, any>>(Stack: ReturnType<typeof createNativeStackNavigator<T>>) {
  return (
    <>
      <Stack.Screen
        name={"FairPricingBreakdown" as any}
        component={FairPricingBreakdownScreen as any}
        options={{ title: "Fair Pricing Breakdown" }}
      />
      <Stack.Screen name={"Checkout" as any} component={CheckoutScreen as any} options={{ title: "Payment" }} />
      <Stack.Screen name={"BookingTracking" as any} component={BookingTrackingScreen as any} options={{ title: "Track Booking" }} />
      <Stack.Screen name={"Invoice" as any} component={InvoiceScreen as any} options={{ title: "Invoice" }} />
      <Stack.Screen name={"Rating" as any} component={RatingScreen as any} options={{ title: "Rate Your Professional" }} />
      <Stack.Screen name={"Chat" as any} component={ChatScreen as any} options={{ title: "" }} />
      <Stack.Screen
        name={"LocationPicker" as any}
        component={LocationPickerScreen as any}
        options={{ title: "Service location", presentation: "modal" }}
      />
      <Stack.Screen
        name={"AddAddress" as any}
        component={AddAddressScreen as any}
        options={{ title: "Add address", presentation: "modal" }}
      />
    </>
  );
}

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen
        name="ServiceCatalog"
        component={ServiceCatalogScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="BookingSlot"
        component={BookingSlotScreen}
        options={{ title: "Schedule" }}
      />
      {sharedScreens(HomeStack)}
    </HomeStack.Navigator>
  );
}

const BookingsStack = createNativeStackNavigator<BookingsStackParamList>();
function BookingsStackNavigator() {
  return (
    <BookingsStack.Navigator screenOptions={screenOptions}>
      <BookingsStack.Screen
        name="BookingsList"
        component={BookingsListScreen}
        options={{ headerShown: false }}
      />
      {sharedScreens(BookingsStack)}
    </BookingsStack.Navigator>
  );
}

const EmergencyStack = createNativeStackNavigator<EmergencyStackParamList>();
function EmergencyStackNavigator() {
  return (
    <EmergencyStack.Navigator screenOptions={screenOptions}>
      <EmergencyStack.Screen
        name="EmergencyBooking"
        component={EmergencyBookingScreen}
        options={{ headerShown: false }}
      />
      {sharedScreens(EmergencyStack)}
    </EmergencyStack.Navigator>
  );
}

export default function CustomerNavigator() {
  return (
    <BottomTabs
      tabs={[
        { key: "home", label: "Home", icon: "home", Screen: HomeStackNavigator },
        { key: "bookings", label: "Bookings", icon: "calendar", Screen: BookingsStackNavigator },
        { key: "emergency", label: "Emergency", icon: "alert-circle", Screen: EmergencyStackNavigator },
        { key: "profile", label: "Profile", icon: "person", Screen: CustomerProfileScreen },
      ]}
    />
  );
}
