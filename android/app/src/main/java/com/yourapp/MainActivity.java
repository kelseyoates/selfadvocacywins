@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(null);  // Pass null to avoid memory leaks
}

@Override
protected void onDestroy() {
    super.onDestroy();
    Runtime.getRuntime().gc();  // Force garbage collection
} 