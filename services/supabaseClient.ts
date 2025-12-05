
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://suqmfxgohxxcyuorpelo.supabase.co';
// Using the provided service role key as requested for this admin tool
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cW1meGdvaHh4Y3l1b3JwZWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1NDI0NiwiZXhwIjoyMDgwMzMwMjQ2fQ.yO530DU8-gWPCY4uoTqiQeO55T_UxKsFy8PXKXWj56I';

// Disable session persistence to avoid issues in sandboxed environments or when using Service Role key client-side
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

export const verifyAdminLogin = async (username: string, password: string): Promise<{ success: boolean; name?: string; id?: string; error?: string }> => {
  try {
    // Query the 'Admin' table
    // We use limit(1) instead of single() to avoid "Cannot coerce..." errors if duplicates exist
    const { data: users, error } = await supabase
      .from('Admin')
      .select('*') 
      .eq('phone', username) // Authenticating using phone number column
      .eq('password', password)
      .limit(1);

    if (error) {
      console.error("Login verification failed:", error.message);
      return { success: false, error: error.message };
    }

    if (!users || users.length === 0) {
      return { success: false, error: "Invalid phone number or password." };
    }

    const data = users[0];

    // Explicitly use 'admin_id' as requested by the user.
    // This ensures we get the correct column for Foreign Key relationships.
    const userId = data.admin_id; 
    const userName = data.name ?? data.Name ?? 'Admin';

    if (userId === undefined || userId === null) {
      console.error("User found but 'admin_id' column is missing or null on the record.", data);
      return { success: false, error: "Account configuration error: missing admin_id." };
    }

    return { 
      success: true, 
      name: userName, 
      id: String(userId) // Ensure it is a string for consistency in app state
    };
  } catch (err: any) {
    console.error("Unexpected login error:", err);
    return { success: false, error: err.message || "An unexpected network error occurred." };
  }
};

export interface SwapHistoryRecord {
  id?: number;
  Customer_ID: string;
  Customer_Name: string;
  admin_id: string | number; // Allow number to support Integer Foreign Keys
  Admin_Name: string; // The name of the admin performing the swap
  Old_Device: string;
  New_Device: string;
  Date: string;
  status: string; // 'success' or error message
}

export const recordSwapTransaction = async (record: SwapHistoryRecord) => {
  const { error } = await supabase
    .from('Swap_History')
    .insert([record]);
  
  if (error) {
    console.error("Failed to record swap history:", error.message);
    throw new Error(`History logging failed: ${error.message}`);
  }
};

export const getSwapHistory = async (adminId: string | number): Promise<SwapHistoryRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('Swap_History')
      .select('*')
      .eq('admin_id', adminId)
      .order('Date', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error: any) {
    console.error("Error fetching history:", error.message);
    throw error;
  }
};

export interface CollectionTransactionRecord {
  "Customer ID": string | null;
  "Full Name": string;
  "Barcode": string;
  "SIM": string;
  "Agent": string;
  "Province": string;
  "Date": string;
}

export const recordCollectionTransaction = async (record: CollectionTransactionRecord) => {
  console.log("Attempting to insert Collection Record:", record);
  
  const { error } = await supabase
    .from('Collection_History')
    .insert([record]);
  
  if (error) {
    console.error("Failed to record collection history. Supabase Error:", error);
    throw new Error(`Database Insert Failed: ${error.message} (${error.code})`);
  }
};

export const getCollectionHistory = async (agentName: string): Promise<CollectionTransactionRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('Collection_History')
      .select('*')
      .eq('Agent', agentName)
      .order('Date', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error: any) {
    console.error("Error fetching collection history:", error.message);
    throw error;
  }
};

// New function to fetch ALL collection history for statistics
export const getAllCollectionHistory = async (): Promise<CollectionTransactionRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('Collection_History')
      .select('*')
      .order('Date', { ascending: true }); // Ordered by date for easier chart processing

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error: any) {
    console.error("Error fetching all collection history:", error.message);
    throw error;
  }
};
