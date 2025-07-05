export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'patient' | 'doctor';
  createdAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  preferredDoctorId?: string;
  preferredDoctorName?: string;
  date: string;
  time: string;
  healthConcern: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
  createdAt: Date;
}

export interface Feedback {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface Doctor {
  uid: string;
  name: string;
  email: string;
  specialization?: string;
}