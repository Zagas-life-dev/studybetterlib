import EditCourseClient from './edit-course-client';

// Updated server component to properly handle params in Next.js
export default async function EditCoursePage({ params }: { params: { id: string } }) {
  // With async function, we can directly access params.id without using React.use
  const id = params.id;
  
  return <EditCourseClient id={id} />;
}
