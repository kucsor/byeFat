'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';

const profileSchema = z.object({
  gender: z.enum(['male', 'female'], { required_error: 'Te rog selectează sexul.' }),
  age: z.coerce.number().min(1, 'Vârsta trebuie să fie un număr pozitiv.'),
  weight: z.coerce.number().min(1, 'Greutatea trebuie să fie un număr pozitiv.'),
  height: z.coerce.number().min(1, 'Înălțimea trebuie să fie un număr pozitiv.'),
  goal: z.enum(['lose', 'maintain', 'gain'], { required_error: 'Te rog selectează un obiectiv.' }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function CalorieCalculator({ userProfile }: { userProfile: UserProfile }) {
  const { firestore } = useFirebase();
  const router = useRouter();
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      gender: userProfile.gender,
      age: userProfile.age,
      weight: userProfile.weight,
      height: userProfile.height,
      goal: userProfile.goal ?? 'maintain',
    },
  });

  const { watch } = form;
  const formData = watch();

  const results = useMemo(() => {
    const { gender, age, weight, height } = formData;
    if (!gender || !age || !weight || !height) return null;

    // Mifflin-St Jeor Equation for BMR
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161);
    
    // TDEE (sedentary) = Maintenance calories
    const tdee = bmr * 1.2;
    const maintenanceCalories = Math.round(tdee);
    
    // Deficit target (500 kcal for weight loss)
    const deficitTarget = 500;

    const maintain = {
        calories: maintenanceCalories,
        protein: Math.round((tdee * 0.3) / 4),
        carbs: Math.round((tdee * 0.4) / 4),
        fat: Math.round((tdee * 0.3) / 9),
    };
    const lose = {
        calories: Math.round(tdee - deficitTarget),
        protein: Math.round(( (tdee - deficitTarget) * 0.4) / 4),
        carbs: Math.round(( (tdee - deficitTarget) * 0.3) / 4),
        fat: Math.round(( (tdee - deficitTarget) * 0.3) / 9),
    };
    const gain = {
        calories: Math.round(tdee + 500),
        protein: Math.round(( (tdee + 500) * 0.35) / 4),
        carbs: Math.round(( (tdee + 500) * 0.45) / 4),
        fat: Math.round(( (tdee + 500) * 0.2) / 9),
    };

    return { 
      lose, 
      maintain, 
      gain, 
      maintenanceCalories, 
      deficitTarget 
    };

  }, [formData]);

  const goalDescriptions: Record<string, string> = {
    lose: 'Deficit de ~500 kcal pentru slăbit.',
    maintain: 'Calorii estimate pentru menținere.',
    gain: 'Surplus de ~500 kcal pt. masă musculară.'
  };

  const goalTitles: Record<string, string> = {
    lose: 'Slăbire',
    maintain: 'Menținere',
    gain: 'Creștere'
  };


  const onSubmit = (values: ProfileFormData) => {
    if (!firestore || !userProfile || !results) return;

    const userDocRef = doc(firestore, 'users', userProfile.id);

    const goalData = results[values.goal];

    const updatedProfile = {
      ...values,
      // Save maintenance and deficit info
      maintenanceCalories: results.maintenanceCalories,
      deficitTarget: values.goal === 'lose' ? results.deficitTarget : 0,
      // Target calories based on goal
      dailyCalories: goalData.calories,
      dailyProtein: goalData.protein,
      dailyCarbs: goalData.carbs,
      dailyFat: goalData.fat,
    };
    
    updateDocumentNonBlocking(userDocRef, updatedProfile);
    
    const todayString = format(new Date(), 'yyyy-MM-dd');

    // If weight is provided, add it to history for today.
    // This ensures the graph is populated.
    if (values.weight) {
        const weightHistoryRef = doc(firestore, 'users', userProfile.id, 'weightHistory', todayString);
        setDocumentNonBlocking(weightHistoryRef, {
            date: todayString,
            weight: values.weight,
        }, { merge: true });
    }

    // Also update today's dailyLog document to reflect new goals immediately.
    // This ensures that when the user returns to the dashboard, they see the new goals.
    // Past days are unaffected. Future days will snapshot these new goals when they are first created.
    const dailyLogRef = doc(firestore, 'users', userProfile.id, 'dailyLogs', todayString);
    const updatedGoals = {
      goalCalories: goalData.calories,
      goalProtein: goalData.protein,
      goalCarbs: goalData.carbs,
      goalFat: goalData.fat,
      maintenanceCalories: results.maintenanceCalories,
      deficitTarget: values.goal === 'lose' ? results.deficitTarget : 0,
    };
    setDocumentNonBlocking(dailyLogRef, updatedGoals, { merge: true });

    router.push('/');
  };
  
  // Reset form when userProfile changes
  useEffect(() => {
    form.reset({
      gender: userProfile.gender,
      age: userProfile.age,
      weight: userProfile.weight,
      height: userProfile.height,
      goal: userProfile.goal ?? 'maintain',
    });
  }, [userProfile, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculator Calorii & Macronutrienți</CardTitle>
        <CardDescription>
          Calculează-ți necesarul zilnic și salvează-ți obiectivele. Nivelul de activitate este considerat sedentar.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Sex</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="male" />
                        </FormControl>
                        <FormLabel className="font-normal">Masculin</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="female" />
                        </FormControl>
                        <FormLabel className="font-normal">Feminin</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vârstă</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25" {...field} onFocus={(e) => e.target.select()} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Greutate (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="70" {...field} onFocus={(e) => e.target.select()} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Înălțime (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="175" {...field} onFocus={(e) => e.target.select()} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {results && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Obiectivele tale zilnice</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['lose', 'maintain', 'gain'] as const).map((key) => {
                        const value = results[key];
                        return (
                            <Card key={key} className={formData.goal === key ? 'border-primary' : ''}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base capitalize">{goalTitles[key]}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-1">
                                    <CardDescription>{goalDescriptions[key]}</CardDescription>
                                    <p className="font-bold text-lg text-primary pt-1">{value.calories} kcal</p>
                                    <div className="grid grid-cols-3 gap-x-1 text-muted-foreground pt-1 text-xs">
                                      <span>{value.protein}g P</span>
                                      <span>{value.carbs}g C</span>
                                      <span>{value.fat}g F</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
              </div>
            )}
             <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Obiectivul meu este...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="lose" />
                        </FormControl>
                        <FormLabel className="font-normal">Să slăbesc</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="maintain" />
                        </FormControl>
                        <FormLabel className="font-normal">Să mă mențin</FormLabel>
                      </FormItem>
                       <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="gain" />
                        </FormControl>
                        <FormLabel className="font-normal">Să cresc în masă musculară</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!results}>Salvează Obiectivele</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
