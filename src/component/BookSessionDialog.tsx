import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface BookSessionDialogProps {
  teacherId: string;
  teacherName: string;
  skills: string[];
}

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const durations = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export const BookSessionDialog = ({ teacherId, teacherName, skills }: BookSessionDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBookSession = async () => {
    if (!selectedDate || !selectedTime || !selectedSkill) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase.from('sessions').insert({
        teacher_id: teacherId,
        learner_id: user?.id,
        skill: selectedSkill,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(duration),
        notes: notes || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Session requested successfully!');
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to book session');
      console.error('Error booking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedSkill('');
    setDuration('60');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Book Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a Session with {teacherName}</DialogTitle>
          <DialogDescription>
            Schedule a learning session and select your preferred time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Select Skill</Label>
            <Select value={selectedSkill} onValueChange={setSelectedSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a skill to learn" />
              </SelectTrigger>
              <SelectContent>
                {skills.map((skill) => (
                  <SelectItem key={skill} value={skill}>
                    {skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Date</Label>
            <div className="flex justify-center border rounded-md p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md"
              />
            </div>
          </div>

          {selectedDate && (
            <div className="space-y-2">
              <Label>Select Time</Label>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durations.map((dur) => (
                  <SelectItem key={dur.value} value={dur.value.toString()}>
                    {dur.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes or topics you'd like to cover..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {selectedDate && selectedTime && (
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-medium">Session Summary:</p>
              <p className="text-sm text-muted-foreground mt-2">
                {format(selectedDate, 'PPP')} at {selectedTime}
              </p>
              <p className="text-sm text-muted-foreground">
                Duration: {durations.find(d => d.value.toString() === duration)?.label}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleBookSession}
            disabled={loading || !selectedDate || !selectedTime || !selectedSkill}
          >
            {loading ? 'Booking...' : 'Book Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
