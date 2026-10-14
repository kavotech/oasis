export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_join_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          requested_role: string
          school_name: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          requested_role: string
          school_name: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          requested_role?: string
          school_name?: string
          status?: string
        }
        Relationships: []
      }
      admission_applications: {
        Row: {
          applicant_name: string
          applying_for_class: string | null
          created_at: string
          date_of_birth: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          school_id: string
          status: string
        }
        Insert: {
          applicant_name: string
          applying_for_class?: string | null
          created_at?: string
          date_of_birth?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          school_id: string
          status?: string
        }
        Update: {
          applicant_name?: string
          applying_for_class?: string | null
          created_at?: string
          date_of_birth?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_visit_requests: {
        Row: {
          contact_name: string
          created_at: string
          district: string
          id: string
          phone: string
          preferred_time: string | null
          school_name: string
          status: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          district: string
          id?: string
          phone: string
          preferred_time?: string | null
          school_name: string
          status?: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          district?: string
          id?: string
          phone?: string
          preferred_time?: string | null
          school_name?: string
          status?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string | null
          id: string
          max_score: number
          school_id: string
          score: number | null
          student_id: string
          subject: string
          term: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_score?: number
          school_id: string
          score?: number | null
          student_id: string
          subject: string
          term?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_score?: number
          school_id?: string
          score?: number | null
          student_id?: string
          subject?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string | null
          notes: string | null
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          school_id: string
          status: string
          student_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      behaviour_incidents: {
        Row: {
          created_at: string
          description: string
          id: string
          logged_by: string | null
          points: number
          school_id: string
          student_id: string
          type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          logged_by?: string | null
          points?: number
          school_id: string
          student_id: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          logged_by?: string | null
          points?: number
          school_id?: string
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "behaviour_incidents_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviour_incidents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviour_incidents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          school_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          school_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string | null
          capacity: number | null
          class_teacher_id: string | null
          created_at: string
          education_level: string | null
          id: string
          name: string
          room_number: string | null
          school_id: string
        }
        Insert: {
          academic_year?: string | null
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          education_level?: string | null
          id?: string
          name: string
          room_number?: string | null
          school_id: string
        }
        Update: {
          academic_year?: string | null
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          education_level?: string | null
          id?: string
          name?: string
          room_number?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          school_id: string
          student_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          school_id: string
          student_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          schedule: string | null
          school_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          schedule?: string | null
          school_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          schedule?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      dormitories: {
        Row: {
          capacity: number | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dormitories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_entries: {
        Row: {
          created_at: string
          exam_date: string | null
          exam_name: string
          id: string
          result: string | null
          school_id: string
          seat_number: string | null
          student_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          exam_name: string
          id?: string
          result?: string | null
          school_id: string
          seat_number?: string | null
          student_id: string
          subject: string
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          exam_name?: string
          id?: string
          result?: string | null
          school_id?: string
          seat_number?: string | null
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_types: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_categories: {
        Row: {
          amount: number
          class_id: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          amount: number
          class_id?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          amount?: number
          class_id?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_categories_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_discounts: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          school_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          name: string
          school_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_discounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoices: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string | null
          id: string
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          school_id: string
          status?: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_bands: {
        Row: {
          created_at: string
          grade: string
          id: string
          max_score: number
          min_score: number
          remark: string | null
          school_id: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          max_score: number
          min_score: number
          remark?: string | null
          school_id: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          max_score?: number
          min_score?: number
          remark?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_bands_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_emergency_contact: boolean
          phone: string | null
          profile_id: string | null
          relationship: string | null
          school_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_emergency_contact?: boolean
          phone?: string | null
          profile_id?: string | null
          relationship?: string | null
          school_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_emergency_contact?: boolean
          phone?: string | null
          profile_id?: string | null
          relationship?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          class_name: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          school_id: string
          subject: string
          title: string
        }
        Insert: {
          class_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          school_id: string
          subject: string
          title: string
        }
        Update: {
          class_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          school_id?: string
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "houses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          allergy: string | null
          condition: string | null
          created_at: string
          id: string
          medication: string | null
          notes: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          allergy?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          medication?: string | null
          notes?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          allergy?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          medication?: string | null
          notes?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          school_id: string
          sender_id: string | null
          subject: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          id?: string
          school_id: string
          sender_id?: string | null
          subject: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          school_id?: string
          sender_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          has_seen_tutorial: boolean
          id: string
          is_form_tutor: boolean
          is_headteacher: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          tutor_group: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          has_seen_tutorial?: boolean
          id: string
          is_form_tutor?: boolean
          is_headteacher?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          tutor_group?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          has_seen_tutorial?: boolean
          id?: string
          is_form_tutor?: boolean
          is_headteacher?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          tutor_group?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      safeguarding_concerns: {
        Row: {
          concern: string
          created_at: string
          id: string
          raised_by: string | null
          school_id: string
          status: string
          student_id: string | null
        }
        Insert: {
          concern: string
          created_at?: string
          id?: string
          raised_by?: string | null
          school_id: string
          status?: string
          student_id?: string | null
        }
        Update: {
          concern?: string
          created_at?: string
          id?: string
          raised_by?: string | null
          school_id?: string
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safeguarding_concerns_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safeguarding_concerns_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safeguarding_concerns_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_terms: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string
          school_id: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          school_id: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          school_id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_trips: {
        Row: {
          cost: number | null
          created_at: string
          destination: string | null
          id: string
          name: string
          school_id: string
          trip_date: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          destination?: string | null
          id?: string
          name: string
          school_id: string
          trip_date?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          destination?: string | null
          id?: string
          name?: string
          school_id?: string
          trip_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_trips_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          academic_year: string | null
          address: string | null
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          district: string | null
          id: string
          logo_url: string | null
          name: string
          onboarding_skipped_steps: string[]
          plan: string | null
          school_type: string | null
          status: Database["public"]["Enums"]["school_status"]
          student_band: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_skipped_steps?: string[]
          plan?: string | null
          school_type?: string | null
          status?: Database["public"]["Enums"]["school_status"]
          student_band?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_skipped_steps?: string[]
          plan?: string | null
          school_type?: string | null
          status?: Database["public"]["Enums"]["school_status"]
          student_band?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      send_records: {
        Row: {
          created_at: string
          id: string
          need_type: string
          review_date: string | null
          school_id: string
          student_id: string
          support_plan: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          need_type: string
          review_date?: string | null
          school_id: string
          student_id: string
          support_plan?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          need_type?: string
          review_date?: string | null
          school_id?: string
          student_id?: string
          support_plan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "send_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_teams: {
        Row: {
          coach_id: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_teams_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sports_teams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          department_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_date: string | null
          full_name: string
          gender: string | null
          id: string
          job_title: string | null
          national_id: string | null
          nationality: string | null
          phone: string | null
          photo_url: string | null
          profile_id: string | null
          qualifications: string | null
          salary: number | null
          school_id: string
          staff_number: string | null
          status: string
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          department_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          job_title?: string | null
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          qualifications?: string | null
          salary?: number | null
          school_id: string
          staff_number?: string | null
          status?: string
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          department_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          job_title?: string | null
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          qualifications?: string | null
          salary?: number | null
          school_id?: string
          staff_number?: string | null
          status?: string
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          school_id: string
          staff_id: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          school_id: string
          staff_id: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          school_id?: string
          staff_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_date: string | null
          admission_number: string | null
          allergies: string | null
          blood_group: string | null
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          dormitory: string | null
          dormitory_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          fee_category: string | null
          fee_category_id: string | null
          first_name: string | null
          form_class: string | null
          full_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_profile_id: string | null
          house: string | null
          house_id: string | null
          id: string
          last_name: string | null
          medical_conditions: string | null
          middle_name: string | null
          nationality: string | null
          photo_url: string | null
          preferred_name: string | null
          previous_school: string | null
          religion: string | null
          school_id: string
          status: string
          stream_id: string | null
          student_profile_id: string | null
          transport_route: string | null
          transport_route_id: string | null
          updated_at: string
        }
        Insert: {
          admission_date?: string | null
          admission_number?: string | null
          allergies?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          dormitory?: string | null
          dormitory_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fee_category?: string | null
          fee_category_id?: string | null
          first_name?: string | null
          form_class?: string | null
          full_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_profile_id?: string | null
          house?: string | null
          house_id?: string | null
          id?: string
          last_name?: string | null
          medical_conditions?: string | null
          middle_name?: string | null
          nationality?: string | null
          photo_url?: string | null
          preferred_name?: string | null
          previous_school?: string | null
          religion?: string | null
          school_id: string
          status?: string
          stream_id?: string | null
          student_profile_id?: string | null
          transport_route?: string | null
          transport_route_id?: string | null
          updated_at?: string
        }
        Update: {
          admission_date?: string | null
          admission_number?: string | null
          allergies?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          dormitory?: string | null
          dormitory_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fee_category?: string | null
          fee_category_id?: string | null
          first_name?: string | null
          form_class?: string | null
          full_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_profile_id?: string | null
          house?: string | null
          house_id?: string | null
          id?: string
          last_name?: string | null
          medical_conditions?: string | null
          middle_name?: string | null
          nationality?: string | null
          photo_url?: string | null
          preferred_name?: string | null
          previous_school?: string | null
          religion?: string | null
          school_id?: string
          status?: string
          stream_id?: string | null
          student_profile_id?: string | null
          transport_route?: string | null
          transport_route_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_dormitory_id_fkey"
            columns: ["dormitory_id"]
            isOneToOne: false
            referencedRelation: "dormitories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_fee_category_id_fkey"
            columns: ["fee_category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_guardian_profile_id_fkey"
            columns: ["guardian_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_transport_route_id_fkey"
            columns: ["transport_route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          class_name: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          school_id: string
          start_time: string
          subject: string
          teacher_id: string | null
        }
        Insert: {
          class_name: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          school_id: string
          start_time: string
          subject: string
          teacher_id?: string | null
        }
        Update: {
          class_name?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          school_id?: string
          start_time?: string
          subject?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_consents: {
        Row: {
          consent_given: boolean
          created_at: string
          id: string
          school_id: string
          student_id: string
          trip_id: string
        }
        Insert: {
          consent_given?: boolean
          created_at?: string
          id?: string
          school_id: string
          student_id: string
          trip_id: string
        }
        Update: {
          consent_given?: boolean
          created_at?: string
          id?: string
          school_id?: string
          student_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_consents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_consents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "school_trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mobile_otp_consume: { Args: { p_id: string }; Returns: undefined }
      mobile_otp_get_latest_unconsumed: {
        Args: { p_email: string; p_purpose: string }
        Returns: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
        }[]
      }
      mobile_otp_get_recent: {
        Args: { p_email: string; p_purpose: string }
        Returns: {
          created_at: string
        }[]
      }
      mobile_otp_increment_attempts: {
        Args: { p_id: string }
        Returns: undefined
      }
      mobile_otp_insert: {
        Args: {
          p_code_hash: string
          p_email: string
          p_expires_at: string
          p_purpose: string
        }
        Returns: undefined
      }
      submit_school_registration: {
        Args: {
          p_address?: string
          p_contact_email?: string
          p_contact_name?: string
          p_contact_phone?: string
          p_district?: string
          p_name: string
          p_school_type?: string
          p_student_band?: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
    }
    Enums: {
      school_status:
        | "pending_review"
        | "approved"
        | "rejected"
        | "more_info_requested"
        | "suspended"
      user_role:
        | "super_admin"
        | "school_admin"
        | "teacher"
        | "parent"
        | "student"
        | "bursar"
        | "librarian"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      school_status: [
        "pending_review",
        "approved",
        "rejected",
        "more_info_requested",
        "suspended",
      ],
      user_role: [
        "super_admin",
        "school_admin",
        "teacher",
        "parent",
        "student",
        "bursar",
        "librarian",
      ],
    },
  },
} as const
