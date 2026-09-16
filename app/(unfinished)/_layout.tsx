import { Stack } from 'expo-router';
import BookListLayout from '@/components/bookListLayout';

const UnfinishedLayout = () => {
  return (
    <BookListLayout>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="unfinished"
          options={{
            headerShown: false,
            headerTitle: 'Unfinished',
          }}
        />
      </Stack>
    </BookListLayout>
  );
};

export default UnfinishedLayout;
