CREATE POLICY "Users can view own quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.id = quiz_attempts.enrollment_id
      AND enrollments.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);