'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction } from 'firebase/firestore';

const usernameSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.').max(15, 'Username must be 15 characters or less.').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
});

export function CreateUsernameDialog() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof usernameSchema>>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof usernameSchema>) => {
    if (!firestore || !user) return;

    const username = values.username.toLowerCase();
    const userDocRef = doc(firestore, 'users', user.uid);
    const usernameDocRef = doc(firestore, 'usernames', username);

    form.clearErrors();

    try {
      await runTransaction(firestore, async (transaction) => {
        const usernameDoc = await transaction.get(usernameDocRef);
        if (usernameDoc.exists()) {
          throw new Error('Username already exists. Please choose another one.');
        }

        // The user document should already exist from the onAuthStateChanged trigger,
        // so we use update here.
        transaction.update(userDocRef, { username: username });
        transaction.set(usernameDocRef, { userId: user.uid });
      });

      // No need to close dialog, page will re-render with the dashboard
    } catch (e: any) {
      form.setError('username', { type: 'manual', message: e.message });
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Choose your Username</DialogTitle>
          <DialogDescription>
            This is your unique name on the platform and will be shown on the products you create.
            Choose wisely, it cannot be changed later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="your_username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Username'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
