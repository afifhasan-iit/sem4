'use client';
import { useState } from "react";

const smells = [
  {
    category: "Bloaters",
    color: "#ff6b6b",
    items: [
      {
        name: "Long Method",
        oneliner: "A method that has grown to handle multiple responsibilities, making it hard to read, test, or safely change without side effects.",
        bad: `public OrderRecord processOrder(Order order) {
    // --- VALIDATION ---
    if (order.getId() == null)
        throw new IllegalArgumentException("Order ID is required");
    if (order.getItems() == null || order.getItems().isEmpty())
        throw new IllegalArgumentException("Order must have at least one item");
    if (order.getCustomer() == null || order.getCustomer().getEmail() == null)
        throw new IllegalArgumentException("Customer email is required");
    if (order.getCustomer().getAddress() == null)
        throw new IllegalArgumentException("Shipping address is incomplete");

    // --- CALCULATE TOTAL ---
    double subtotal = 0;
    for (Item item : order.getItems()) {
        if (item.getQuantity() <= 0)
            throw new IllegalArgumentException("Bad qty: " + item.getName());
        subtotal += item.getPrice() * item.getQuantity();
    }
    double total = subtotal;
    if ("SAVE10".equals(order.getCouponCode())) total *= 0.9;
    else if ("SAVE20".equals(order.getCouponCode())) total *= 0.8;
    double tax = total * 0.15;
    total += tax;

    // --- SEND CONFIRMATION EMAIL ---
    StringBuilder itemLines = new StringBuilder();
    for (Item i : order.getItems())
        itemLines.append("  - ").append(i.getName())
                 .append(" x").append(i.getQuantity())
                 .append(": $").append(i.getPrice() * i.getQuantity()).append("\n");
    String emailBody = "Hi " + order.getCustomer().getName() + ",\n"
        + "Thanks for your order #" + order.getId() + ".\n"
        + "Items:\n" + itemLines
        + String.format("Subtotal: $%.2f | Tax: $%.2f | Total: $%.2f", subtotal, tax, total);
    EmailService.send(order.getCustomer().getEmail(), "Order Confirmed", emailBody);

    // --- UPDATE INVENTORY ---
    for (Item item : order.getItems()) {
        if (Inventory.getStock(item.getId()) < item.getQuantity())
            throw new IllegalStateException("Insufficient stock for " + item.getName());
        Inventory.reduce(item.getId(), item.getQuantity());
    }

    // --- SAVE TO DB ---
    OrderRecord record = new OrderRecord(order, subtotal, tax, total,
        "confirmed", LocalDateTime.now());
    Database.save("orders", record);
    Database.save("audit_log",
        new AuditEntry(order.getId(), "created", record.getCreatedAt()));
    return record;
}`,
        good: `// Each method has ONE job. processOrder is now a coordinator.
public OrderRecord processOrder(Order order) {
    validateOrder(order);
    Pricing pricing = calculatePricing(order);
    reserveInventory(order.getItems());
    sendConfirmationEmail(order, pricing);
    return saveOrder(order, pricing);
}

private void validateOrder(Order order) {
    if (order.getId() == null)
        throw new IllegalArgumentException("Order ID is required");
    if (order.getItems() == null || order.getItems().isEmpty())
        throw new IllegalArgumentException("Cart is empty");
    if (order.getCustomer() == null || order.getCustomer().getEmail() == null)
        throw new IllegalArgumentException("Customer email required");
    for (Item item : order.getItems())
        if (item.getQuantity() <= 0)
            throw new IllegalArgumentException("Bad qty: " + item.getName());
}

private Pricing calculatePricing(Order order) {
    Map<String, Double> coupons = Map.of("SAVE10", 0.9, "SAVE20", 0.8);
    double subtotal = order.getItems().stream()
        .mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
    double discounted = subtotal * coupons.getOrDefault(order.getCouponCode(), 1.0);
    double tax = discounted * 0.15;
    return new Pricing(subtotal, tax, discounted + tax);
}

private void reserveInventory(List<Item> items) {
    for (Item item : items) {
        if (Inventory.getStock(item.getId()) < item.getQuantity())
            throw new IllegalStateException("Out of stock: " + item.getName());
        Inventory.reduce(item.getId(), item.getQuantity());
    }
}

private void sendConfirmationEmail(Order order, Pricing pricing) {
    String itemLines = order.getItems().stream()
        .map(i -> "  - " + i.getName() + " x" + i.getQuantity()
                + ": $" + (i.getPrice() * i.getQuantity()))
        .collect(Collectors.joining("\n"));
    String body = "Hi " + order.getCustomer().getName()
        + ", your order #" + order.getId() + " is confirmed.\nItems:\n" + itemLines + "\n"
        + String.format("Subtotal: $%.2f | Tax: $%.2f | Total: $%.2f",
            pricing.subtotal(), pricing.tax(), pricing.total());
    EmailService.send(order.getCustomer().getEmail(), "Order Confirmed", body);
}

private OrderRecord saveOrder(Order order, Pricing pricing) {
    OrderRecord record = new OrderRecord(order, pricing, "confirmed", LocalDateTime.now());
    Database.save("orders", record);
    Database.save("audit_log",
        new AuditEntry(order.getId(), "created", record.getCreatedAt()));
    return record;
}`,
      },
      {
        name: "Large Class",
        oneliner: "A class that has accumulated too many responsibilities over time, becoming a hub for unrelated logic that should live in separate, focused classes.",
        bad: `// This class handles auth, email, DB, reporting — all in one place.
// It changes for completely unrelated reasons.
public class UserManager {

    // --- AUTH ---
    public String login(String email, String password) {
        User user = db.find("users", email);
        if (user == null || !BCrypt.checkpw(password, user.getPasswordHash()))
            throw new RuntimeException("Invalid credentials");
        String token = JWT.sign(user.getId(), System.getenv("JWT_SECRET"));
        db.save("sessions", new Session(user.getId(), token));
        return token;
    }
    public void logout(String token) { db.delete("sessions", token); }
    public User register(String email, String password, String name) {
        if (db.find("users", email) != null) throw new RuntimeException("Email taken");
        return db.save("users", new User(email, BCrypt.hashpw(password, 10), name));
    }

    // --- EMAILS ---
    public void sendWelcomeEmail(User user) {
        smtp.send(user.getEmail(), "Welcome!",
            "<h1>Welcome, " + user.getName() + "!</h1>");
    }
    public void sendPasswordResetEmail(User user) {
        String token = TokenUtils.generate();
        db.save("reset_tokens", new ResetToken(user.getId(), token));
        smtp.send(user.getEmail(), "Reset your password",
            "<a href=\"/reset?token=" + token + "\">Reset</a>");
    }

    // --- DATABASE ---
    public User findById(String id)       { return db.find("users", id); }
    public User findByEmail(String email) { return db.find("users", email); }
    public void updateProfile(String id, Map<String, Object> data) { db.update("users", id, data); }
    public void deleteAccount(String id)  { db.delete("users", id); }

    // --- REPORTING ---
    public Map<String, Integer> generateMonthlyReport() {
        List<User> users = db.findAll("users");
        int thisMonth = LocalDate.now().getMonthValue();
        long newThisMonth = users.stream()
            .filter(u -> u.getCreatedAt().getMonthValue() == thisMonth).count();
        return Map.of("total", users.size(), "newThisMonth", (int) newThisMonth);
    }
    public String exportToCSV() {
        return "id,email,name\n" + db.findAll("users").stream()
            .map(u -> u.getId() + "," + u.getEmail() + "," + u.getName())
            .collect(Collectors.joining("\n"));
    }
}`,
        good: `// Split by axis of change. Each class has one reason to be modified.

public class AuthService {
    private final Database db;
    private final String secret;
    public AuthService(Database db, String secret) { this.db = db; this.secret = secret; }

    public String login(String email, String password) {
        User user = db.find("users", email);
        if (user == null || !BCrypt.checkpw(password, user.getPasswordHash()))
            throw new RuntimeException("Invalid credentials");
        String token = JWT.sign(user.getId(), secret);
        db.save("sessions", new Session(user.getId(), token));
        return token;
    }
    public void logout(String token) { db.delete("sessions", token); }
    public User register(String email, String password, String name) {
        if (db.find("users", email) != null) throw new RuntimeException("Email taken");
        return db.save("users", new User(email, BCrypt.hashpw(password, 10), name));
    }
}

public class UserEmailService {
    private final SMTPClient smtp;
    private final Database db;
    public UserEmailService(SMTPClient smtp, Database db) { this.smtp = smtp; this.db = db; }

    public void sendWelcome(User user) {
        smtp.send(user.getEmail(), "Welcome!", "<h1>Welcome, " + user.getName() + "!</h1>");
    }
    public void sendPasswordReset(User user) {
        String token = TokenUtils.generate();
        db.save("reset_tokens", new ResetToken(user.getId(), token));
        smtp.send(user.getEmail(), "Reset your password",
            "<a href=\"/reset?token=" + token + "\">Reset</a>");
    }
}

public class UserRepository {
    private final Database db;
    public UserRepository(Database db) { this.db = db; }
    public User findById(String id)       { return db.find("users", id); }
    public User findByEmail(String email) { return db.find("users", email); }
    public void update(String id, Map<String, Object> data) { db.update("users", id, data); }
    public void delete(String id)         { db.delete("users", id); }
}

public class UserReportService {
    private final Database db;
    public UserReportService(Database db) { this.db = db; }
    public Map<String, Integer> monthlyStats() {
        List<User> users = db.findAll("users");
        int thisMonth = LocalDate.now().getMonthValue();
        long newCount = users.stream()
            .filter(u -> u.getCreatedAt().getMonthValue() == thisMonth).count();
        return Map.of("total", users.size(), "newThisMonth", (int) newCount);
    }
    public String exportCSV() {
        return "id,email,name\n" + db.findAll("users").stream()
            .map(u -> u.getId() + "," + u.getEmail() + "," + u.getName())
            .collect(Collectors.joining("\n"));
    }
}

// ─── WIRING THEM ALL TOGETHER ─────────────────────────────────────────────
// Each service gets only the dependencies it needs.
// Swap db or smtp for a mock in tests without touching anything else.

Database db     = new Database();
SMTPClient smtp = new SMTPClient();

AuthService       authService    = new AuthService(db, System.getenv("JWT_SECRET"));
UserEmailService  emailService   = new UserEmailService(smtp, db);
UserRepository    userRepository = new UserRepository(db);
UserReportService reportService  = new UserReportService(db);

// ─── USAGE EXAMPLES ───────────────────────────────────────────────────────

// Register a new user and send a welcome email:
authService.register("alice@example.com", "s3cr3t", "Alice");
User newUser = userRepository.findByEmail("alice@example.com");
emailService.sendWelcome(newUser);

// Log in and get a JWT:
String jwt = authService.login("alice@example.com", "s3cr3t");

// Update profile via the repository:
userRepository.update(newUser.getId(), Map.of("name", "Alice Smith"));

// Generate a monthly report — no auth or email logic involved:
Map<String, Integer> stats = reportService.monthlyStats();
System.out.println("Total: " + stats.get("total")
    + ", new this month: " + stats.get("newThisMonth"));

// Each service is independently testable:
// AuthService auth = new AuthService(mockDb, "test-secret");
// → no smtp, no reporting, no side effects`,
      },
      {
        name: "Primitive Obsession",
        oneliner: "Using raw strings and numbers to represent domain concepts, leading to duplicated validation logic scattered across the codebase with no single source of truth.",
        bad: `// All domain concepts are raw strings and ints.
// Validation duplicated everywhere. No single source of truth.
public User registerUser(String name, String email, String phone, int birthYear) {
    if (!email.contains("@") || !email.contains("."))
        throw new IllegalArgumentException("Invalid email");
    if (phone.replaceAll("\\D", "").length() != 10)
        throw new IllegalArgumentException("Phone must be 10 digits");
    if (birthYear < 1900 || birthYear > Year.now().getValue())
        throw new IllegalArgumentException("Invalid birth year");
    return new User(name, email, phone, birthYear);
}

public void updateContactInfo(String userId, String email, String phone) {
    // Same validation copy-pasted again:
    if (!email.contains("@") || !email.contains("."))
        throw new IllegalArgumentException("Invalid email");
    if (phone.replaceAll("\\D", "").length() != 10)
        throw new IllegalArgumentException("Phone must be 10 digits");
    db.update("users", userId, Map.of("email", email, "phone", phone));
}

public void sendMarketingEmail(String email, String subject, String body) {
    // And again...
    if (!email.contains("@") || !email.contains("."))
        throw new IllegalArgumentException("Invalid email");
    mailer.send(email, subject, body);
}`,
        good: `// Each domain concept is a self-validating, self-describing object.
public class Email {
    private final String value;
    public Email(String value) {
        if (!value.contains("@") || !value.contains("."))
            throw new IllegalArgumentException("Invalid email: " + value);
        this.value = value.toLowerCase().trim();
    }
    public boolean equals(Email other) { return this.value.equals(other.value); }
    @Override public String toString()  { return value; }
}

public class PhoneNumber {
    private final String digits;
    public PhoneNumber(String value) {
        digits = value.replaceAll("\\D", "");
        if (digits.length() != 10)
            throw new IllegalArgumentException("Invalid phone: " + value);
    }
    public String formatted() {
        return "(" + digits.substring(0,3) + ") "
            + digits.substring(3,6) + "-" + digits.substring(6);
    }
}

public class BirthYear {
    private final int value;
    public BirthYear(int year) {
        if (year < 1900 || year > Year.now().getValue())
            throw new IllegalArgumentException("Invalid birth year: " + year);
        this.value = year;
    }
    public int age() { return Year.now().getValue() - value; }
}

// Now consumers just pass typed objects — no validation scattered around:
public User registerUser(String name, String email, String phone, int birthYear) {
    return new User(name, new Email(email), new PhoneNumber(phone), new BirthYear(birthYear));
}

public void updateContactInfo(String userId, String email, String phone) {
    db.update("users", userId,
        Map.of("email", new Email(email), "phone", new PhoneNumber(phone)));
}

public void sendMarketingEmail(String email, String subject, String body) {
    mailer.send(new Email(email), subject, body);
}`,
      },
      {
        name: "Long Parameter List",
        oneliner: "A function that accepts so many arguments that callers can't tell what each one means without reading the implementation or docs.",
        bad: `// What does the 7th argument mean again?
public Employee createEmployee(
    String firstName, String lastName, int age,
    String email,     String phone,
    String street,    String city, String zip, String country,
    String department, String role, double salary,
    String startDate, boolean isFullTime, String managerEmail
) {
    if (!email.contains("@")) throw new IllegalArgumentException("Bad email");
    if (salary < 0) throw new IllegalArgumentException("Salary can't be negative");
    return new Employee(firstName + " " + lastName, age, email, phone,
        new Address(street, city, zip, country),
        new Employment(department, role, salary, startDate, isFullTime, managerEmail));
}

// Calling this is a nightmare — what is 'true' here?
createEmployee("John", "Doe", 30, "j@ex.com", "5551234567",
    "123 Main", "Springfield", "62701", "US",
    "Engineering", "Senior Dev", 120000, "2024-01-15", true, "mgr@ex.com");`,
        good: `// Group related params into meaningful objects (Java 16+ records).
public record EmployeeName(String first, String last, int age) {}
public record ContactInfo(String email, String phone) {}
public record Address(String street, String city, String zip, String country) {}
public record Employment(String department, String role, double salary,
                         String startDate, boolean isFullTime, String managerEmail) {}

public Employee createEmployee(
        EmployeeName name, ContactInfo contact,
        Address address, Employment employment) {
    if (!contact.email().contains("@"))
        throw new IllegalArgumentException("Bad email");
    if (employment.salary() < 0)
        throw new IllegalArgumentException("Salary can't be negative");
    return new Employee(name.first() + " " + name.last(),
        name.age(), contact, address, employment);
}

// Calling this is self-documenting:
createEmployee(
    new EmployeeName("John", "Doe", 30),
    new ContactInfo("j@ex.com", "5551234567"),
    new Address("123 Main", "Springfield", "62701", "US"),
    new Employment("Engineering", "Senior Dev", 120000,
        "2024-01-15", true, "mgr@ex.com")
);`,
      },
      {
        name: "Data Clumps",
        oneliner: "A group of variables that always appear together across the codebase but have never been promoted into a dedicated object with a name and behavior.",
        bad: `// lat, lng, label — always three, always together. But never a type.
public void plotMarker(double lat, double lng, String label) {
    map.pin(lat, lng, label);
}

public double distanceBetween(double lat1, double lng1, double lat2, double lng2) {
    double R = 6371;
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.pow(Math.sin(dLat / 2), 2)
        + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
        * Math.pow(Math.sin(dLng / 2), 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

public void saveLocation(String userId, double lat, double lng, String label) {
    db.save("locations", Map.of("userId", userId, "lat", lat, "lng", lng, "label", label));
}

public String formatLocation(double lat, double lng, String label) {
    return String.format("%s (%.4f, %.4f)", label, lat, lng);
}`,
        good: `// Give the clump a name. Behavior now lives with its data.
public class GeoLocation {
    private final double lat, lng;
    private final String label;

    public GeoLocation(double lat, double lng, String label) {
        if (lat < -90 || lat > 90)   throw new IllegalArgumentException("Invalid latitude");
        if (lng < -180 || lng > 180) throw new IllegalArgumentException("Invalid longitude");
        this.lat = lat; this.lng = lng; this.label = label;
    }

    public double distanceTo(GeoLocation other) {
        double R    = 6371;
        double dLat = Math.toRadians(other.lat - this.lat);
        double dLng = Math.toRadians(other.lng - this.lng);
        double a    = Math.pow(Math.sin(dLat / 2), 2)
            + Math.cos(Math.toRadians(this.lat)) * Math.cos(Math.toRadians(other.lat))
            * Math.pow(Math.sin(dLng / 2), 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    @Override public String toString() {
        return String.format("%s (%.4f, %.4f)", label, lat, lng);
    }
}

// All callers become simpler:
public void plotMarker(GeoLocation loc) { map.pin(loc.getLat(), loc.getLng(), loc.getLabel()); }
public void saveLocation(String userId, GeoLocation loc) {
    db.save("locations", Map.of("userId", userId, "location", loc));
}
public String formatLocation(GeoLocation loc) { return loc.toString(); }

GeoLocation home   = new GeoLocation(23.8103, 90.4125, "Dhaka");
GeoLocation office = new GeoLocation(23.7506, 90.3655, "Dhanmondi");
System.out.printf("Distance: %.1f km%n", home.distanceTo(office));`,
      },
    ],
  },
  {
    category: "Object-Orientation Abusers",
    color: "#ffa94d",
    items: [
      {
        name: "Alternative Classes with Different Interfaces",
        oneliner: "Two classes that serve the same purpose but expose completely different method names, making them impossible to use interchangeably without extra glue code.",
        bad: `// These two do the same thing but speak different languages.
// Code that uses one can never be swapped for the other.
public class EmailSender {
    public void sendEmail(String toAddress, String emailSubject, String emailBody) {
        smtp.connect();
        smtp.send(toAddress, emailSubject, emailBody);
        smtp.close();
    }
}

public class SMSDispatcher {
    public void dispatchText(String mobileNo, String content) {
        twilioClient.messages().create(mobileNo, content, SMS_FROM);
    }
}

// Can't write generic notification code without if/else:
public void notify(String channel, String target, String subject, String body) {
    if ("email".equals(channel)) {
        new EmailSender().sendEmail(target, subject, body);
    } else if ("sms".equals(channel)) {
        new SMSDispatcher().dispatchText(target, body); // subject silently dropped!
    }
}`,
        good: `// Unified interface. Generic code works with any channel.
public interface MessageSender {
    void send(String recipient, String subject, String body);
}

public class EmailSender implements MessageSender {
    public void send(String recipient, String subject, String body) {
        smtp.connect();
        smtp.send(recipient, subject, body);
        smtp.close();
    }
}

public class SMSSender implements MessageSender {
    public void send(String recipient, String subject, String body) {
        // SMS doesn't use subject — prepended internally
        twilioClient.messages().create(recipient, subject + ": " + body, SMS_FROM);
    }
}

public class PushNotificationSender implements MessageSender {
    public void send(String recipient, String subject, String body) {
        pushService.notify(recipient, subject, body);
    }
}

// Generic code that works with ANY channel — no if/else needed:
public void notify(MessageSender sender, String recipient, String subject, String body) {
    sender.send(recipient, subject, body);
}

notify(new EmailSender(), "user@ex.com", "Alert", "Server is down");
notify(new SMSSender(),   "+8801700000", "Alert", "Server is down");`,
      },
      {
        name: "Refused Bequest",
        oneliner: "A subclass that inherits a broad parent interface but must throw errors or do nothing for methods it doesn't actually support, violating the contract it promised to fulfill.",
        bad: `// Animal promises all subclasses can swim, fly, and speak.
// That's a lie — and subclasses have to throw to prove it.
public class Animal {
    public void eat(String food) { System.out.println("Eating " + food); }
    public void sleep()          { System.out.println("Sleeping..."); }
    public void fly()            { System.out.println("Flying!"); }
    public void swim()           { System.out.println("Swimming!"); }
    public void speak()          { System.out.println("..."); }
}

public class Dog extends Animal {
    @Override public void fly() {
        throw new UnsupportedOperationException("Dogs cannot fly!");
    }
    @Override public void speak() { System.out.println("Woof!"); }
}

public class Penguin extends Animal {
    @Override public void fly() {
        throw new UnsupportedOperationException("Penguins cannot fly!");
    }
    @Override public void speak() { System.out.println("Squawk!"); }
}

public class GoldFish extends Animal {
    @Override public void fly()   { throw new UnsupportedOperationException("Fish cannot fly!"); }
    @Override public void speak() { throw new UnsupportedOperationException("Fish don't speak!"); }
}

// Any code that calls animal.fly() may blow up at runtime.`,
        good: `// Model capabilities accurately with interfaces.
public abstract class Animal {
    protected final String name;
    public Animal(String name) { this.name = name; }
    public void eat(String food) { System.out.println(name + " eats " + food); }
    public void sleep()          { System.out.println(name + " sleeps"); }
}

public interface Swimmer { void swim(); }
public interface Flyer   { void fly();  }

public class Dog extends Animal implements Swimmer {
    public Dog(String name) { super(name); }
    public void swim()  { System.out.println(name + " swims"); }
    public void speak() { System.out.println("Woof!"); }
}

public class Eagle extends Animal implements Flyer {
    public Eagle(String name) { super(name); }
    public void fly()   { System.out.println(name + " flies"); }
    public void speak() { System.out.println("Screech!"); }
}

public class Duck extends Animal implements Flyer, Swimmer {
    public Duck(String name) { super(name); }
    public void fly()   { System.out.println(name + " flies"); }
    public void swim()  { System.out.println(name + " swims"); }
    public void speak() { System.out.println("Quack!"); }
}

public class GoldFish extends Animal implements Swimmer {
    public GoldFish(String name) { super(name); }
    public void swim() { System.out.println(name + " swims"); }
}

// No surprises. Duck CAN fly. GoldFish CANNOT.`,
      },
      {
        name: "Switch Statements",
        oneliner: "A switch or if/else chain that encodes type-based behavior and must be updated every time a new variant is added, instead of letting each type handle its own behavior.",
        bad: `// Every time a new shape is added, every switch must be touched.
// Violates the Open/Closed Principle.
public double getArea(Shape shape) {
    switch (shape.getType()) {
        case "circle":    return Math.PI * Math.pow(shape.getRadius(), 2);
        case "rectangle": return shape.getWidth() * shape.getHeight();
        case "triangle":  return 0.5 * shape.getBase() * shape.getHeight();
        default: throw new IllegalArgumentException("Unknown shape: " + shape.getType());
    }
}

public double getPerimeter(Shape shape) {
    switch (shape.getType()) {
        case "circle":    return 2 * Math.PI * shape.getRadius();
        case "rectangle": return 2 * (shape.getWidth() + shape.getHeight());
        case "triangle":  return shape.getA() + shape.getB() + shape.getC();
        default: throw new IllegalArgumentException("Unknown shape: " + shape.getType());
    }
}

public String describe(Shape shape) {
    switch (shape.getType()) {
        case "circle":    return "Circle with radius " + shape.getRadius();
        case "rectangle": return "Rectangle " + shape.getWidth() + "x" + shape.getHeight();
        default: return "Unknown shape";
    }
}`,
        good: `// Add a new shape by adding ONE new class. Zero edits elsewhere.
public abstract class Shape {
    public abstract double area();
    public abstract double perimeter();
    public abstract String describe();
}

public class Circle extends Shape {
    private final double radius;
    public Circle(double radius) { this.radius = radius; }
    public double area()      { return Math.PI * radius * radius; }
    public double perimeter() { return 2 * Math.PI * radius; }
    public String describe()  { return "Circle with radius " + radius; }
}

public class Rectangle extends Shape {
    private final double width, height;
    public Rectangle(double width, double height) { this.width = width; this.height = height; }
    public double area()      { return width * height; }
    public double perimeter() { return 2 * (width + height); }
    public String describe()  { return "Rectangle " + width + "×" + height; }
}

public class Triangle extends Shape {
    private final double base, height, a, b, c;
    public Triangle(double base, double height, double a, double b, double c) {
        this.base = base; this.height = height;
        this.a = a; this.b = b; this.c = c;
    }
    public double area()      { return 0.5 * base * height; }
    public double perimeter() { return a + b + c; }
    public String describe()  { return "Triangle with base " + base; }
}

// Adding Trapezoid? Just write a new class. No existing code touched.

List<Shape> shapes = List.of(new Circle(5), new Rectangle(4, 6), new Triangle(3, 4, 3, 4, 5));
double totalArea = shapes.stream().mapToDouble(Shape::area).sum();`,
      },
      {
        name: "Temporary Field",
        oneliner: "An instance variable that is only set and meaningful during one specific operation, leaving the object in an incomplete or misleading state the rest of the time.",
        bad: `// ShippingCalculator has 3 instance fields: baseRate, discount, destination.
// But they are ONLY set inside calculate() and mean nothing outside it.
// Between calls, the object is in a broken, half-filled state.
public class ShippingCalculator {

    // ⚠️ These are "temporary fields" — they are ONLY valid
    // while calculate() is running. Outside that method,
    // they are null/0 and have no meaning.
    private double baseRate;
    private double discount;
    private String destination;

    // Step 1: sets the temporary fields
    public double calculate(Order order) {
        this.destination = order.getDestination(); // e.g. "international"
        this.baseRate    = order.getWeight() * 2.5;
        this.discount    = order.isPriorityMember() ? 0.10 : 0.0;
        return applyDiscount();
    }

    // Step 2: reads the temporary fields
    private double applyDiscount() {
        double rate = "international".equals(destination) ? baseRate * 1.5 : baseRate;
        return rate - (rate * discount);
    }
}

// ─── WHY THIS IS A PROBLEM ────────────────────────────────────────────────

ShippingCalculator calc = new ShippingCalculator();

// ❌ What are these right now? Null, 0, null.
//    The object looks "valid" but it's actually broken:
System.out.println(calc.baseRate);    // 0.0   — meaningless
System.out.println(calc.discount);    // 0.0   — meaningless
System.out.println(calc.destination); // null  — meaningless

Order order1 = new Order("international", 10, true);
System.out.println(calc.calculate(order1)); // 33.75 ✓

// ❌ Now the fields hold leftover state from order1.
//    They are "dirty" until the next calculate() call.
System.out.println(calc.destination); // "international" — stale!

// ❌ Thread-safety nightmare: if two threads call calculate()
//    simultaneously, they share and corrupt each other's fields.
Order order2 = new Order("domestic", 5, false);
// Thread A sets destination = "international", weight = 10
// Thread B sets destination = "domestic",      weight = 5
// Thread A reads destination = "domestic" ← WRONG! Corrupted by B.`,
        good: `// Fix 1 — SIMPLEST: pass everything as local variables inside the method.
// No shared state. Each call is fully self-contained and thread-safe.
public class ShippingCalculator {

    public double calculate(Order order) {
        // ✅ All "state" is local — lives only for this one call.
        String destination = order.getDestination();
        double baseRate    = order.getWeight() * 2.5;
        double discount    = order.isPriorityMember() ? 0.10 : 0.0;

        double rate = "international".equals(destination) ? baseRate * 1.5 : baseRate;
        return rate - (rate * discount);
    }
}

// ─────────────────────────────────────────────────────────────────────────

// Fix 2 — CLEANER: extract a small data class that carries the intermediate
// state explicitly, making it obvious what belongs together.
public class ShippingContext {
    public final String destination;
    public final double baseRate;
    public final double discount;

    public ShippingContext(Order order) {
        this.destination = order.getDestination();
        this.baseRate    = order.getWeight() * 2.5;
        this.discount    = order.isPriorityMember() ? 0.10 : 0.0;
    }

    public double finalRate() {
        double rate = "international".equals(destination) ? baseRate * 1.5 : baseRate;
        return rate - (rate * discount);
    }
}

public class ShippingCalculator {
    public double calculate(Order order) {
        return new ShippingContext(order).finalRate();
    }
}

// ─── WHY THIS IS BETTER ───────────────────────────────────────────────────

ShippingCalculator calc = new ShippingCalculator();

Order order1 = new Order("international", 10, true);
Order order2 = new Order("domestic",      5, false);

System.out.println(calc.calculate(order1)); // 33.75 ✓
System.out.println(calc.calculate(order2)); // 12.50 ✓

// ✅ The calculator itself holds NO state between calls.
//    Call it from 100 threads at once — no corruption possible.
//    The object is always in a valid, predictable state.`,
      },
    ],
  },
  {
    category: "Change Preventers",
    color: "#69db7c",
    items: [
      {
        name: "Divergent Change",
        oneliner: "A class that must be modified for multiple unrelated reasons — pricing rules, database schema, email templates — all causing edits to the same file.",
        bad: `// This class changes when: pricing rules change, DB schema changes,
// export format changes, or notification templates change.
// Four unrelated reasons to touch one file.
public class Order {
    private List<Item> items;
    private Customer customer;

    // Changes when pricing/tax rules change:
    public double calculateTotal() {
        double subtotal = items.stream().mapToDouble(i -> i.getPrice() * i.getQty()).sum();
        double discount = customer.isPremium() ? subtotal * 0.1 : 0;
        double tax      = (subtotal - discount) * 0.15;
        return subtotal - discount + tax;
    }

    // Changes when DB schema changes:
    public void save() {
        db.run("INSERT INTO orders (customer_id, total, created_at) VALUES (?, ?, ?)",
            customer.getId(), calculateTotal(), System.currentTimeMillis());
    }

    // Changes when export format changes:
    public String exportCSV() {
        return "item,qty,price\n" + items.stream()
            .map(i -> i.getName() + "," + i.getQty() + "," + i.getPrice())
            .collect(Collectors.joining("\n"));
    }

    // Changes when email template changes:
    public void sendConfirmation() {
        mailer.send(customer.getEmail(), "Order Confirmed",
            "Hi " + customer.getName() + ", your order of $"
            + calculateTotal() + " is confirmed!");
    }
}`,
        good: `// Each class has exactly ONE reason to change.
public class Order {
    private final List<Item> items;
    private final Customer customer;
    public Order(List<Item> items, Customer customer) {
        this.items = items; this.customer = customer;
    }
    public List<Item> getItems()  { return items; }
    public Customer getCustomer() { return customer; }
}

public class OrderPricingService {
    public double calculate(Order order) {
        double subtotal = order.getItems().stream()
            .mapToDouble(i -> i.getPrice() * i.getQty()).sum();
        double discount = order.getCustomer().isPremium() ? subtotal * 0.1 : 0;
        return subtotal - discount + (subtotal - discount) * 0.15;
    }
}

public class OrderRepository {
    public void save(Order order, double total) {
        db.run("INSERT INTO orders (customer_id, total, created_at) VALUES (?, ?, ?)",
            order.getCustomer().getId(), total, System.currentTimeMillis());
    }
}

public class OrderExportService {
    public String toCSV(Order order) {
        return "item,qty,price\n" + order.getItems().stream()
            .map(i -> i.getName() + "," + i.getQty() + "," + i.getPrice())
            .collect(Collectors.joining("\n"));
    }
}

public class OrderNotificationService {
    public void sendConfirmation(Order order, double total) {
        mailer.send(order.getCustomer().getEmail(), "Order Confirmed",
            "Hi " + order.getCustomer().getName()
            + ", your order of $" + total + " is confirmed!");
    }
}`,
      },
      {
        name: "Parallel Inheritance Hierarchies",
        oneliner: "Adding a subclass to one hierarchy always forces you to add a matching subclass to another, coupling two separate trees so they must grow in lockstep.",
        bad: `// SCENARIO: A payment system.
// We have a hierarchy of payment METHODS (CreditCard, PayPal, Bitcoin).
// We also have a hierarchy of payment LOGGERS (one per method).
//
// The problem: every time you add a new payment method,
// you are FORCED to also add a matching Logger class.
// Nothing in the compiler enforces this — if you forget, it silently breaks.

// ─── HIERARCHY 1: Payment Methods ─────────────────────────────────────────

public abstract class Payment {
    protected double amount;
    public Payment(double amount) { this.amount = amount; }
    public abstract void process();
}

public class CreditCardPayment extends Payment {
    public CreditCardPayment(double amount) { super(amount); }
    public void process() { System.out.println("Charging $" + amount + " to credit card"); }
}

public class PayPalPayment extends Payment {
    public PayPalPayment(double amount) { super(amount); }
    public void process() { System.out.println("Sending $" + amount + " via PayPal"); }
}

public class BitcoinPayment extends Payment {
    public BitcoinPayment(double amount) { super(amount); }
    public void process() { System.out.println("Broadcasting $" + amount + " in Bitcoin"); }
}

// ─── HIERARCHY 2: Payment Loggers (one per payment type) ──────────────────
// This hierarchy exists ONLY because the first one exists.
// They are forever locked in lockstep.

public abstract class PaymentLogger {
    public abstract void log(Payment payment);
}

public class CreditCardLogger extends PaymentLogger {
    public void log(Payment p) {
        System.out.println("[LOG] Credit card payment of $" + p.amount);
    }
}

public class PayPalLogger extends PaymentLogger {
    public void log(Payment p) {
        System.out.println("[LOG] PayPal payment of $" + p.amount);
    }
}

public class BitcoinLogger extends PaymentLogger {
    public void log(Payment p) {
        System.out.println("[LOG] Bitcoin payment of $" + p.amount);
    }
}

// ─── WIRING THEM TOGETHER ─────────────────────────────────────────────────
// To use them, you need a manual mapping — yet more code to maintain:

public PaymentLogger getLogger(Payment p) {
    if (p instanceof CreditCardPayment) return new CreditCardLogger();
    if (p instanceof PayPalPayment)     return new PayPalLogger();
    if (p instanceof BitcoinPayment)    return new BitcoinLogger();
    throw new IllegalArgumentException("No logger for: " + p.getClass());
}

// ❌ Now add "BankTransfer" payment:
//    → Must add BankTransferPayment  (hierarchy 1)
//    → Must add BankTransferLogger   (hierarchy 2)  ← easy to forget!
//    → Must add another if() branch in getLogger()  ← easy to forget!
//    Three places to touch. Every. Single. Time.`,
        good: `// SOLUTION: Collapse the two hierarchies into one.
// Each Payment class is responsible for logging itself.
// There is no separate Logger hierarchy at all.

public abstract class Payment {
    protected final double amount;
    public Payment(double amount) { this.amount = amount; }

    public abstract void process();

    // ✅ Logging belongs here — it's about THIS payment type.
    //    Each subclass knows exactly what to log about itself.
    public abstract void log();
}

public class CreditCardPayment extends Payment {
    private final String last4digits;

    public CreditCardPayment(double amount, String last4digits) {
        super(amount);
        this.last4digits = last4digits;
    }
    public void process() {
        System.out.println("Charging $" + amount + " to card ending in " + last4digits);
    }
    public void log() {
        System.out.println("[LOG] Credit card •••• " + last4digits + " — $" + amount);
    }
}

public class PayPalPayment extends Payment {
    private final String email;

    public PayPalPayment(double amount, String email) {
        super(amount);
        this.email = email;
    }
    public void process() { System.out.println("Sending $" + amount + " to " + email + " via PayPal"); }
    public void log()     { System.out.println("[LOG] PayPal → " + email + " — $" + amount); }
}

public class BitcoinPayment extends Payment {
    private final String walletAddress;

    public BitcoinPayment(double amount, String walletAddress) {
        super(amount);
        this.walletAddress = walletAddress;
    }
    public void process() { System.out.println("Broadcasting $" + amount + " to " + walletAddress); }
    public void log()     { System.out.println("[LOG] Bitcoin → " + walletAddress + " — $" + amount); }
}

// ─── ADDING A NEW PAYMENT TYPE ────────────────────────────────────────────
// ✅ Add BankTransfer? Just ONE new class. Nothing else to touch.

public class BankTransferPayment extends Payment {
    private final String accountNumber;

    public BankTransferPayment(double amount, String accountNumber) {
        super(amount);
        this.accountNumber = accountNumber;
    }
    public void process() { System.out.println("Transferring $" + amount + " to account " + accountNumber); }
    public void log()     { System.out.println("[LOG] Bank transfer → " + accountNumber + " — $" + amount); }
}

// ─── USAGE ────────────────────────────────────────────────────────────────
// No mapping needed. No parallel class needed. Just use it.

List<Payment> payments = List.of(
    new CreditCardPayment(120.00, "4242"),
    new PayPalPayment(45.00, "user@example.com"),
    new BitcoinPayment(300.00, "1A2B3C4D"),
    new BankTransferPayment(500.00, "BD1234567890")
);

for (Payment p : payments) {
    p.process(); // each knows how to process itself
    p.log();     // each knows how to log itself
}

// Output:
// Charging $120.0 to card ending in 4242
// [LOG] Credit card •••• 4242 — $120.0
// Sending $45.0 to user@example.com via PayPal
// [LOG] PayPal → user@example.com — $45.0
// Broadcasting $300.0 to 1A2B3C4D
// [LOG] Bitcoin → 1A2B3C4D — $300.0
// Transferring $500.0 to account BD1234567890
// [LOG] Bank transfer → BD1234567890 — $500.0`,
      },
      {
        name: "Shotgun Surgery",
        oneliner: "A single conceptual change — like updating a tax rate or a base URL — requires small edits scattered across many unrelated classes, making it easy to miss one.",
        bad: `// Change the tax rate or payment URL? Edit 6 files. Miss one = bug.
public class Invoice {
    public double getTotal(double subtotal) { return subtotal + subtotal * 0.15; }
    public String getPaymentUrl(String id)  { return "https://pay.myapp.com/invoice/" + id; }
}

public class Receipt {
    public double getGrandTotal(double amount) { return amount + amount * 0.15; }
    public String getReceiptLink(String id)    { return "https://pay.myapp.com/receipt/" + id; }
}

public class Quote {
    public double getPriceWithTax(double price) { return price + price * 0.15; }
}

public class Cart {
    public void checkout(double subtotal, String cartId) {
        double total = subtotal + subtotal * 0.15;
        redirect("https://pay.myapp.com/checkout/" + cartId);
    }
}`,
        good: `// One place to change. Zero chance of missing a spot.
public class Config {
    public static final double TAX_RATE     = 0.15;
    public static final String PAYMENT_HOST = "https://pay.myapp.com";
}

public class TaxService {
    public static double apply(double amount) { return amount + amount * Config.TAX_RATE; }
    public static String rateLabel() { return (int)(Config.TAX_RATE * 100) + "%"; }
}

public class PaymentLinks {
    public static String invoice(String id)  { return Config.PAYMENT_HOST + "/invoice/"  + id; }
    public static String receipt(String id)  { return Config.PAYMENT_HOST + "/receipt/"  + id; }
    public static String checkout(String id) { return Config.PAYMENT_HOST + "/checkout/" + id; }
    public static String pay(String id)      { return Config.PAYMENT_HOST + "/pay/"      + id; }
}

// All classes now read from the same source of truth:
public class Invoice {
    public double getTotal(double subtotal) { return TaxService.apply(subtotal); }
    public String getPaymentUrl(String id)  { return PaymentLinks.invoice(id); }
}

public class Cart {
    public void checkout(double subtotal, String cartId) {
        double total = TaxService.apply(subtotal);
        redirect(PaymentLinks.checkout(cartId));
    }
}`,
      },
    ],
  },
  {
    category: "Dispensables",
    color: "#74c0fc",
    items: [
      {
        name: "Comments",
        oneliner: "Comments that explain what the code is doing rather than why, compensating for unclear naming and poor structure instead of actually fixing them.",
        bad: `// Function to process payment
public boolean p(double a, String b, int c, int d) {
    // Check if amount is valid
    if (a <= 0) {
        return false; // Return false if invalid
    }
    // Check if card is not expired
    // Get current year and month
    int y = LocalDate.now().getYear();
    int m = LocalDate.now().getMonthValue();
    // Compare with expiry
    if (c < y || (c == y && d < m)) {
        return false; // Card expired
    }
    // Calculate fee — 2.9% + 30 cents
    double f = a * 0.029 + 0.30;
    // Call the gateway
    gateway.charge(b, a + f);
    return true; // success
}`,
        good: `private static final double GATEWAY_FEE_RATE  = 0.029;
private static final double GATEWAY_FEE_FIXED = 0.30;

public boolean processPayment(double amount, String cardNumber,
                              int expiryYear, int expiryMonth) {
    if (!isValidAmount(amount))               return false;
    if (isCardExpired(expiryYear, expiryMonth)) return false;
    gateway.charge(cardNumber, amount + gatewayFee(amount));
    return true;
}

private boolean isValidAmount(double amount) {
    return amount > 0;
}

private boolean isCardExpired(int expiryYear, int expiryMonth) {
    LocalDate now = LocalDate.now();
    return expiryYear < now.getYear()
        || (expiryYear == now.getYear() && expiryMonth < now.getMonthValue());
}

private double gatewayFee(double amount) {
    return amount * GATEWAY_FEE_RATE + GATEWAY_FEE_FIXED;
}`,
      },
      {
        name: "Duplicate Code",
        oneliner: "The same logic copy-pasted into multiple places, so any bug fix or rule change must be applied everywhere — and someone will inevitably miss a spot.",
        bad: `// Discount logic copy-pasted into three classes.
// Change "VIP = 20% off" to "VIP = 25% off" — someone will miss one.
public class OnlineCheckout {
    public double applyDiscount(User user, double price) {
        if ("vip".equals(user.getTier()))     return price * 0.80;
        if ("premium".equals(user.getTier())) return price * 0.90;
        if (user.getLoyaltyPoints() > 500)    return price * 0.95;
        return price;
    }
}

public class InStoreCheckout {
    public double applyDiscount(Customer customer, double amount) {
        if ("vip".equals(customer.getTier()))     return amount * 0.80;
        if ("premium".equals(customer.getTier())) return amount * 0.90;
        if (customer.getLoyaltyPoints() > 500)    return amount * 0.95;
        return amount;
    }
}

public class MobileAppCheckout {
    public double getDiscountedPrice(Profile profile, double basePrice) {
        // same logic, different variable names — guaranteed to drift
        if ("vip".equals(profile.getTier()))     return basePrice * 0.80;
        if ("premium".equals(profile.getTier())) return basePrice * 0.90;
        if (profile.getLoyaltyPoints() > 500)    return basePrice * 0.95;
        return basePrice;
    }
}`,
        good: `// ONE place. Change once, fixed everywhere.
public class DiscountPolicy {
    private static final int LOYALTY_THRESHOLD = 500;

    public static double apply(UserProfile user, double price) {
        if ("vip".equals(user.getTier()))                    return price * 0.80;
        if ("premium".equals(user.getTier()))                return price * 0.90;
        if (user.getLoyaltyPoints() > LOYALTY_THRESHOLD)    return price * 0.95;
        return price;
    }

    public static String describeFor(UserProfile user) {
        if ("vip".equals(user.getTier()))                 return "VIP 20% discount";
        if ("premium".equals(user.getTier()))             return "Premium 10% discount";
        if (user.getLoyaltyPoints() > LOYALTY_THRESHOLD) return "Loyalty 5% discount";
        return "No discount";
    }
}

public class OnlineCheckout {
    public double applyDiscount(UserProfile u, double p)  { return DiscountPolicy.apply(u, p); }
}
public class InStoreCheckout {
    public double applyDiscount(UserProfile u, double p)  { return DiscountPolicy.apply(u, p); }
}
public class MobileAppCheckout {
    public double getDiscountedPrice(UserProfile u, double p) { return DiscountPolicy.apply(u, p); }
}`,
      },
      {
        name: "Data Class",
        oneliner: "A class that only holds fields and getters, while all the logic that naturally belongs to it is scattered across other classes that operate on its data.",
        bad: `// DateRange is a passive bag of data.
// All logic that belongs to it is scattered across the codebase.
public class DateRange {
    private LocalDate startDate, endDate;
    public DateRange(LocalDate startDate, LocalDate endDate) {
        this.startDate = startDate; this.endDate = endDate;
    }
    public LocalDate getStart() { return startDate; }
    public LocalDate getEnd()   { return endDate; }
}

// Business logic scattered everywhere:
public long getDurationInDays(DateRange range) {
    return ChronoUnit.DAYS.between(range.getStart(), range.getEnd());
}
public boolean isDateInRange(DateRange range, LocalDate date) {
    return !date.isBefore(range.getStart()) && !date.isAfter(range.getEnd());
}
public boolean doRangesOverlap(DateRange r1, DateRange r2) {
    return !r1.getStart().isAfter(r2.getEnd()) && !r1.getEnd().isBefore(r2.getStart());
}
public String formatRange(DateRange range) {
    return range.getStart() + " – " + range.getEnd();
}`,
        good: `// DateRange owns its own behavior. No logic scattered outside.
public class DateRange {
    private final LocalDate startDate, endDate;

    public DateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate))
            throw new IllegalArgumentException("End must be after start");
        this.startDate = startDate; this.endDate = endDate;
    }

    public long durationInDays() {
        return ChronoUnit.DAYS.between(startDate, endDate);
    }

    public boolean contains(LocalDate date) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    public boolean overlaps(DateRange other) {
        return !startDate.isAfter(other.endDate) && !endDate.isBefore(other.startDate);
    }

    public DateRange extend(int days) {
        return new DateRange(startDate, endDate.plusDays(days));
    }

    @Override public String toString() { return startDate + " – " + endDate; }
}

DateRange sprint = new DateRange(
    LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 14));
System.out.println(sprint.durationInDays());                        // 13
System.out.println(sprint.contains(LocalDate.of(2024, 1, 7)));     // true`,
      },
      {
        name: "Dead Code",
        oneliner: "Variables, functions, or classes that are no longer called by anything but remain in the codebase, adding noise and making readers wonder if they're missing something.",
        bad: `public class UserService {
    private final Map<String, User> cache = new HashMap<>();

    public User getUser(String id) { return db.findUser(id); }

    // Added during a caching experiment, never removed:
    public User getUserCached(String id) {
        if (cache.containsKey(id)) return cache.get(id);
        User user = db.findUser(id);
        cache.put(id, user);
        return user;
    }

    // Was used before we switched to OAuth:
    public boolean validatePassword(String plain, String hash) {
        return BCrypt.checkpw(plain, hash);
    }
    public String hashPassword(String plain) {
        return BCrypt.hashpw(plain, BCrypt.gensalt(10));
    }
    public String generateSessionToken()      { return UUID.randomUUID().toString(); }
    public void   invalidateSession(String t) { db.deleteSession(t); }

    // Left over from a descoped feature:
    public String exportUserDataAsXML(User user) {
        return "<user><name>" + user.getName()
            + "</name><email>" + user.getEmail() + "</email></user>";
    }

    public User updateUser(String id, Map<String, Object> data) {
        return db.updateUser(id, data);
    }
}`,
        good: `public class UserService {
    public User getUser(String id)                          { return db.findUser(id); }
    public User updateUser(String id, Map<String, Object> data) { return db.updateUser(id, data); }
}

// Rule of thumb: if it's not called, delete it.
// Git history preserves it if you ever need it back.
// Commented-out code is worse — it's dead code with noise added.`,
      },
      {
        name: "Lazy Class",
        oneliner: "A class so thin — often just one or two trivial methods — that it adds an indirection layer without providing enough value to justify being a separate abstraction.",
        bad: `// Three separate files, three imports, for things that are
// just thin wrappers around a single expression.
public class CelsiusConverter {
    public double toCelsius(double f) { return (f - 32) * 5.0 / 9; }
}
public class FahrenheitConverter {
    public double toFahrenheit(double c) { return c * 9.0 / 5 + 32; }
}
public class KelvinConverter {
    public double toKelvin(double c) { return c + 273.15; }
}

// Three classes, three files, three imports for three one-liners.
new CelsiusConverter().toCelsius(98.6);`,
        good: `// Option A: A utility class with static methods (no instantiation needed)
public final class Temperature {
    private Temperature() {} // utility class, not meant to be instantiated

    public static double toCelsius(double f)    { return (f - 32) * 5.0 / 9; }
    public static double toFahrenheit(double c) { return c * 9.0 / 5 + 32; }
    public static double toKelvin(double c)     { return c + 273.15; }
    public static double toRankine(double c)    { return (c + 273.15) * 9.0 / 5; }
}

Temperature.toCelsius(98.6); // 37.0

// Option B: A value object (justified class) — carries value and unit,
// enables conversions and comparisons on the object itself:
public class TemperatureValue {
    private final double value;
    private final String unit; // "C" or "F"

    public TemperatureValue(double value, String unit) {
        this.value = value; this.unit = unit;
    }
    public double inCelsius() {
        return "C".equals(unit) ? value : (value - 32) * 5.0 / 9;
    }
    public double inFahrenheit() {
        return "F".equals(unit) ? value : inCelsius() * 9.0 / 5 + 32;
    }
    @Override public String toString() { return value + "°" + unit; }
}

TemperatureValue bodyTemp = new TemperatureValue(98.6, "F");
System.out.printf("%.1f°C%n", bodyTemp.inCelsius()); // 37.0°C`,
      },
      {
        name: "Speculative Generality",
        oneliner: "Abstractions, extension hooks, and plugin systems added to handle hypothetical future requirements that never actually arrive, leaving the codebase more complex for no gain.",
        bad: `// "We'll definitely need strategies and factories someday."
// Today: one report type, one format, zero plugins.
public abstract class AbstractReportGenerator {
    protected abstract List<?> fetchData(Map<String, Object> params);
    protected abstract List<?> applyStrategy(List<?> data, ReportStrategy strategy);
    protected abstract String  format(List<?> data, ReportFormatter formatter);

    public String generate(Map<String, Object> params,
                           ReportStrategy strategy, ReportFormatter formatter) {
        List<?> data = fetchData(params);
        return format(applyStrategy(data, strategy), formatter);
    }
}

public class ConcreteReportGeneratorFactory {
    public AbstractReportGenerator createGenerator(String type) {
        // Only ever called with "sales". One real case.
        if ("sales".equals(type)) return new SalesReportGenerator();
        throw new IllegalArgumentException("Unknown generator type");
    }
}

public class SalesReportGenerator extends AbstractReportGenerator {
    protected List<?> fetchData(Map<String, Object> p) { return db.query("SELECT * FROM sales"); }
    protected List<?> applyStrategy(List<?> data, ReportStrategy s) {
        return s != null ? s.process(data) : data;
    }
    protected String format(List<?> data, ReportFormatter f) {
        return f != null ? f.format(data) : data.toString();
    }
}`,
        good: `// YAGNI: You Aren't Gonna Need It.
// Build for what exists. Refactor when a second case arrives.
public class SalesReportGenerator {
    public String generate(Map<String, Object> params) {
        List<SalesRecord> data = db.query(
            "SELECT * FROM sales WHERE month = ?", params.get("month"));
        return format(data);
    }

    private String format(List<SalesRecord> data) {
        return data.stream()
            .map(r -> r.getProduct() + ": $" + String.format("%,.0f", r.getRevenue()))
            .collect(Collectors.joining("\n"));
    }
}

// When a second report type is needed, THEN extract an abstraction.
// The abstraction will be informed by two real cases — not imagined ones.`,
      },
    ],
  },
  {
    category: "Couplers",
    color: "#da77f2",
    items: [
      {
        name: "Feature Envy",
        oneliner: "A method that spends most of its time reaching into another class's data to do its work, which is a strong signal it belongs in that other class instead.",
        bad: `// Order.calculateShippingCost() is basically a Customer method
// that got lost and ended up in the wrong class.
public class Customer {
    private boolean isPremium;
    private Address address; // has country, isRemote fields
    public boolean isPremium()  { return isPremium; }
    public Address getAddress() { return address; }
}

public class Order {
    private Customer customer;
    private List<Item> items;

    // Every line reaches into Customer's data:
    public double calculateShippingCost() {
        boolean isUS     = "US".equals(customer.getAddress().getCountry());
        boolean isRemote = customer.getAddress().isRemote();
        boolean premium  = customer.isPremium();

        double base      = isUS ? 5.00 : 20.00;
        double remoteFee = isRemote ? 12.00 : 0;
        double discount  = premium ? 0.5 : 1.0;
        return (base + remoteFee) * discount;
    }

    public boolean isEligibleForFreeShipping() {
        return customer.isPremium()
            && "US".equals(customer.getAddress().getCountry())
            && !customer.getAddress().isRemote();
    }
}`,
        good: `// Move the behavior to where the data lives.
public class Customer {
    private boolean isPremium;
    private Address address;

    public double shippingCost() {
        double base      = "US".equals(address.getCountry()) ? 5.00 : 20.00;
        double remoteFee = address.isRemote() ? 12.00 : 0;
        double discount  = isPremium ? 0.5 : 1.0;
        return (base + remoteFee) * discount;
    }

    public boolean qualifiesForFreeShipping() {
        return isPremium && "US".equals(address.getCountry()) && !address.isRemote();
    }
}

public class Order {
    private Customer customer;
    private List<Item> items;

    public double calculateShippingCost() {
        if (customer.qualifiesForFreeShipping()) return 0;
        return customer.shippingCost();
    }
}`,
      },
      {
        name: "Inappropriate Intimacy",
        oneliner: "Two classes that directly read and mutate each other's internal fields, bypassing encapsulation so that neither class can change its internals without breaking the other.",
        bad: `// Order directly pokes inside Customer's fields.
// Customer has no control over its own state.
public class Customer {
    public String       name;
    public List<Order>  orders = new ArrayList<>(); // supposed to be internal
    public double       spent  = 0;                  // supposed to be internal
    public String       tier   = "regular";
}

public class Order {
    private String id;
    private double total;

    public void attach(Customer customer) {
        // Directly mutates Customer's internals:
        customer.orders.add(this);
        customer.spent += total;
        if (customer.spent > 10000)
            customer.tier = "vip"; // reaching even deeper!
    }

    public void detach(Customer customer) {
        customer.orders.removeIf(o -> o.id.equals(this.id));
        customer.spent -= total;
        if (customer.spent <= 10000) customer.tier = "regular";
    }
}`,
        good: `// Customer controls its own state. Order just announces events.
public class Customer {
    private final List<Order> orders = new ArrayList<>();
    private double spent = 0;
    private String tier  = "regular";
    public final String name;

    public Customer(String name) { this.name = name; }

    public void addOrder(Order order) {
        orders.add(order);
        spent += order.getTotal();
        updateTier();
    }

    public void removeOrder(String orderId) {
        orders.stream().filter(o -> o.getId().equals(orderId)).findFirst()
            .ifPresent(order -> {
                orders.remove(order);
                spent -= order.getTotal();
                updateTier();
            });
    }

    private void updateTier() { tier = spent > 10000 ? "vip" : "regular"; }

    public int    getOrderCount() { return orders.size(); }
    public double getTotalSpent() { return spent; }
    public String getTier()       { return tier; }
}

public class Order {
    private final String id;
    private final double total;
    public Order(String id, double total) { this.id = id; this.total = total; }
    public String getId()    { return id; }
    public double getTotal() { return total; }
}

// Clean handshake — Order doesn't touch Customer internals:
Customer customer = new Customer("Afif");
Order order = new Order("ORD-1", 5000);
customer.addOrder(order);`,
      },
      {
        name: "Incomplete Library Class",
        oneliner: "A third-party library that almost fits your needs, so workaround logic gets copy-pasted across multiple files instead of being extended once in a shared utility.",
        bad: `// Guava/Streams don't have groupByMultiple out of the box.
// So the workaround gets copy-pasted into every service file.

// In UserService.java (copy-pasted):
Map<String, List<User>> grouped = new HashMap<>();
for (User user : users) {
    String key = user.getCountry() + "-" + user.getDepartment();
    grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(user);
}

// In ReportService.java — same logic, different variable names:
Map<String, List<Record>> segmented = new HashMap<>();
for (Record record : records) {
    String k = record.getRegion() + "_" + record.getTeam();
    segmented.computeIfAbsent(k, key -> new ArrayList<>()).add(record);
}

// In AnalyticsService.java — slightly different, now diverged:
Map<String, List<DataPoint>> buckets = new HashMap<>();
data.forEach(item -> {
    String key = item.getCountry() + "|" + item.getDept();
    buckets.computeIfAbsent(key, k -> new ArrayList<>()).add(item);
});`,
        good: `// Extend the library once, cleanly, in a shared utility class.
// CollectionUtils.java — imported everywhere, changed in one place.
public class CollectionUtils {

    // Groups by multiple key extractors joined with a separator
    public static <T> Map<String, List<T>> groupByMultiple(
            List<T> items,
            List<Function<T, String>> keyExtractors,
            String separator) {
        return items.stream().collect(Collectors.groupingBy(
            item -> keyExtractors.stream()
                .map(f -> f.apply(item))
                .collect(Collectors.joining(separator))
        ));
    }

    // Plucks unique values for a given extractor across a collection
    public static <T, R> List<R> uniqueValues(List<T> items, Function<T, R> extractor) {
        return items.stream().map(extractor).distinct().collect(Collectors.toList());
    }
}

// Usage — consistent, readable, single source of truth:
Map<String, List<User>> byCountryAndDept = CollectionUtils.groupByMultiple(
    users, List.of(User::getCountry, User::getDepartment), "-");

Map<String, List<Record>> byRegionAndTeam = CollectionUtils.groupByMultiple(
    records, List.of(Record::getRegion, Record::getTeam), "-");`,
      },
      {
        name: "Message Chains",
        oneliner: "A caller that navigates a long chain of object references to get what it needs, making it tightly coupled to the entire object graph and brittle to any structural change along the way.",
        bad: `// The caller has to know the entire object graph.
// Change any link in the chain and the caller breaks.
public class Address  { private String city, zipCode, country; /* + getters */ }
public class Profile  { private Address address; public Address getAddress() { return address; } }
public class Customer { private Profile profile; public Profile getProfile() { return profile; } }
public class Order    { private Customer customer; public Customer getCustomer() { return customer; } }

// This code knows about Order → Customer → Profile → Address → every field:
String city    = order.getCustomer().getProfile().getAddress().getCity();
String zipCode = order.getCustomer().getProfile().getAddress().getZipCode();
String country = order.getCustomer().getProfile().getAddress().getCountry();
String label   = city + ", " + zipCode + ", " + country;`,
        good: `// Tell, don't ask. Delegate through the chain.
// Each class exposes only what its callers need.
public class Address {
    private final String city, zipCode, country;
    public Address(String city, String zipCode, String country) {
        this.city = city; this.zipCode = zipCode; this.country = country;
    }
    public String formatted() { return city + ", " + zipCode + ", " + country; }
}

public class Profile {
    private final Address address;
    public Profile(Address address) { this.address = address; }
    public String shippingLabel() { return address.formatted(); }
}

public class Customer {
    private final Profile profile;
    public Customer(Profile profile) { this.profile = profile; }
    public String shippingLabel() { return profile.shippingLabel(); }
}

public class Order {
    private final Customer customer;
    public Order(Customer customer) { this.customer = customer; }
    public String shippingLabel() { return customer.shippingLabel(); }
}

// Caller only talks to its direct neighbor:
String label = order.shippingLabel();
// "Dhaka, 1207, Bangladesh"`,
      },
      {
        name: "Middle Man",
        oneliner: "A class whose every method does nothing but forward the call to another object, adding a layer of indirection with no logic, no validation, and no real purpose of its own.",
        bad: `// Department does NOTHING. Every method is a one-line pass-through.
// It exists only to add an indirection layer with zero value.
public class Engineer {
    public String writeCode()     { return "Code written"; }
    public String reviewPR()      { return "PR reviewed"; }
    public String deployToStage() { return "Deployed to staging"; }
    public String writeTests()    { return "Tests written"; }
}

public class Department {
    private final Engineer engineer = new Engineer();

    public String writeCode()     { return engineer.writeCode(); }
    public String reviewPR()      { return engineer.reviewPR(); }
    public String deployToStage() { return engineer.deployToStage(); }
    public String writeTests()    { return engineer.writeTests(); }
}

// Callers go through Department for no benefit:
Department dept = new Department();
dept.writeCode();  // just calls engineer.writeCode()
dept.reviewPR();   // just calls engineer.reviewPR()`,
        good: `public class Engineer {
    private final String name;
    private boolean busy;
    public Engineer(String name) { this.name = name; }
    public String writeCode()     { return "Code written"; }
    public String reviewPR()      { return "PR reviewed"; }
    public String deployToStage() { return "Deployed to staging"; }
    public boolean isBusy()       { return busy; }
    public String getName()       { return name; }
}

// Option A: Remove the middle man entirely.
Engineer engineer = new Engineer("Bob");
engineer.writeCode();

// Option B: Keep Department only if it adds REAL value:
public class Department {
    private final List<Engineer> engineers;
    public Department(List<Engineer> engineers) { this.engineers = engineers; }

    // Actual added behavior — not just forwarding:
    public Engineer assignTask(String task) {
        Engineer available = engineers.stream()
            .filter(e -> !e.isBusy())
            .findFirst()
            .orElseThrow(() -> new RuntimeException("No engineers available"));
        AuditLog.write(task + " assigned to " + available.getName());
        return available;
    }

    public int headcount() { return engineers.size(); }
}`,
      },
    ],
  },
];

export default function CodeSmells() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeItem, setActiveItem] = useState(0);
  const [tab, setTab] = useState("bad");

  const cat = smells[activeCategory];
  const item = cat.items[activeItem];

  const allItems = smells.flatMap(c => c.items);
  const currentIndex = allItems.findIndex(i => i.name === item.name);

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      background: "#0d0d0d",
      minHeight: "100vh",
      color: "#e0e0e0",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #1e1e1e", background: "#111" }}>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>
          Code Smells Reference
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>
          Bad → Good Examples · Java
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ width: 200, background: "#111", borderRight: "1px solid #1e1e1e", flexShrink: 0, overflowY: "auto", padding: "8px 0" }}>
          {smells.map((cat, ci) => (
            <div key={ci}>
              <div style={{ padding: "10px 16px 4px", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: cat.color, fontWeight: 700 }}>
                {cat.category}
              </div>
              {cat.items.map((it, ii) => (
                <div
                  key={ii}
                  onClick={() => { setActiveCategory(ci); setActiveItem(ii); setTab("bad"); }}
                  style={{
                    padding: "7px 16px", fontSize: 12, cursor: "pointer",
                    background: activeCategory === ci && activeItem === ii ? "#1a1a1a" : "transparent",
                    borderLeft: activeCategory === ci && activeItem === ii ? `2px solid ${cat.color}` : "2px solid transparent",
                    color: activeCategory === ci && activeItem === ii ? "#fff" : "#666",
                    transition: "all 0.15s", lineHeight: 1.4,
                  }}
                >
                  {it.name}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e1e1e", background: "#111" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ background: cat.color + "22", color: cat.color, fontSize: 10, padding: "2px 8px", borderRadius: 3, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
                {cat.category}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", lineHeight: 1.6 }}>// {item.oneliner}</div>
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid #1e1e1e", background: "#0f0f0f" }}>
            {["bad", "good"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "10px 24px", background: tab === t ? "#1a1a1a" : "transparent",
                border: "none",
                borderBottom: tab === t ? `2px solid ${t === "bad" ? "#ff6b6b" : "#69db7c"}` : "2px solid transparent",
                color: tab === t ? (t === "bad" ? "#ff6b6b" : "#69db7c") : "#555",
                cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600,
                letterSpacing: 1, textTransform: "uppercase",
              }}>
                {t === "bad" ? "❌  Bad Code" : "✅  Good Code"}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
            <pre style={{
              background: "#141414",
              border: `1px solid ${tab === "bad" ? "#ff6b6b33" : "#69db7c33"}`,
              borderRadius: 8, padding: 24, margin: 0, fontSize: 13, lineHeight: 1.8,
              color: tab === "bad" ? "#ffb3b3" : "#c3fae8",
              overflowX: "auto", whiteSpace: "pre",
            }}>
              {tab === "bad" ? item.bad : item.good}
            </pre>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 24px", borderTop: "1px solid #1e1e1e", background: "#111" }}>
            <button onClick={() => {
              if (activeItem > 0) { setActiveItem(activeItem - 1); }
              else if (activeCategory > 0) { const p = activeCategory - 1; setActiveCategory(p); setActiveItem(smells[p].items.length - 1); }
              setTab("bad");
            }} style={{ background: "#1e1e1e", border: "none", color: "#888", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              ← Prev
            </button>
            <span style={{ fontSize: 11, color: "#444", alignSelf: "center" }}>
              {currentIndex + 1} / {allItems.length}
            </span>
            <button onClick={() => {
              if (activeItem < cat.items.length - 1) { setActiveItem(activeItem + 1); }
              else if (activeCategory < smells.length - 1) { setActiveCategory(activeCategory + 1); setActiveItem(0); }
              setTab("bad");
            }} style={{ background: "#1e1e1e", border: "none", color: "#888", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}