'use client'
import { useState } from "react";

type CodeSmell = {
  category: string;
  categoryIcon: string;
  name: string;
  subtitle: string;
  explanation: string;
  tags: string[];
  badNote: string;
  bad: string;
  goodNote: string;
  good: string;
  _index?: number;
};

const smells: CodeSmell[] = [
  {
    category: "Bloaters", categoryIcon: "🧱",
    name: "Long Method",
    subtitle: "A method that has grown too large to understand at a glance",
    explanation: "When a method keeps accumulating logic over time — more conditions, more loops, more edge cases — it eventually becomes a wall of code. Nobody wants to read a 200-line function just to change one small behavior. Long methods are hard to test, harder to name, and worst of all, they encourage developers to keep dumping code in because \"it's already messy anyway.\" The sweet spot is a method short enough that its name perfectly describes everything it does.",
    tags: ["Readability", "Maintainability", "SRP"],
    badNote: "One method doing validation, pricing, persistence AND email — four responsibilities jammed together. Change one rule and you risk breaking the others.",
    bad: `void processOrder(Order order) {

  // ── STEP 1: VALIDATE ──────────────────────────
  if (order.items.isEmpty()) return;
  if (order.customer == null)
    throw new Exception("No customer");
  for (Item i : order.items) {
    if (i.stock <= 0)
      throw new Exception("Out of stock: " + i.name);
  }

  // ── STEP 2: CALCULATE TOTAL ───────────────────
  double total = 0;
  for (Item i : order.items) {
    total += i.price * i.qty;
  }
  if (order.hasMembership) total *= 0.90;
  double tax = total * 0.08;
  total += tax;

  // ── STEP 3: PERSIST ───────────────────────────
  db.save(order);
  db.save(new Invoice(order, total));
  db.save(new AuditLog("ORDER_PLACED", order.id));

  // ── STEP 4: NOTIFY ────────────────────────────
  String msg = "Your order #" + order.id
    + " is confirmed. Total: $" + total;
  email.send(order.customer.email, "Order Confirmed", msg);
  sms.send(order.customer.phone, msg);
}`,
    goodNote: "Each responsibility gets a well-named method. processOrder() now reads like a checklist.",
    good: `void processOrder(Order order) {
  validateOrder(order);
  double total = calculateTotal(order);
  persistOrder(order, total);
  notifyCustomer(order, total);
}

void validateOrder(Order order) {
  if (order.items.isEmpty())
    throw new IllegalStateException("Empty cart");
  if (order.customer == null)
    throw new IllegalStateException("No customer");
  for (Item i : order.items)
    if (i.stock <= 0)
      throw new OutOfStockException(i.name);
}

double calculateTotal(Order order) {
  double sub = order.items.stream()
    .mapToDouble(i -> i.price * i.qty).sum();
  if (order.hasMembership) sub *= 0.90;
  return sub + (sub * 0.08);
}

void persistOrder(Order order, double total) {
  db.save(order);
  db.save(new Invoice(order, total));
  db.save(new AuditLog("ORDER_PLACED", order.id));
}

void notifyCustomer(Order order, double total) {
  String msg = "Order #" + order.id
    + " confirmed. Total: $" + total;
  email.send(order.customer.email, "Confirmed", msg);
  sms.send(order.customer.phone, msg);
}`
  },
  {
    category: "Bloaters", categoryIcon: "🧱",
    name: "Large Class",
    subtitle: "A class that has taken on too many responsibilities",
    explanation: "A class starts simple — maybe it handles user authentication. Then someone adds email preferences, then notification settings, then profile pictures. Before long it has 40 fields and 80 methods and no one really knows what it \"is\" anymore. A Large Class is a sign that several distinct concepts got crammed into one place. When you find yourself thinking \"this class handles A... and also B... and C too,\" that's the moment to split.",
    tags: ["SRP", "Cohesion", "God Object"],
    badNote: "UserManager is a God Object — it owns authentication, billing, notifications AND audit logging.",
    bad: `class UserManager {
  String userId, name, email;
  String passwordHash, salt;
  Instant lastLogin;

  String avatarUrl, bio, location, website;
  List<String> interests;

  String stripeCustomerId;
  String plan; // "FREE" | "PRO" | "ENTERPRISE"
  Instant billingCycleEnd;
  boolean pastDue;

  List<Notification> inbox;
  boolean emailNotifs, smsNotifs;

  boolean login(String pw) { ... }
  void logout() { ... }
  void changePassword(String old, String next) { ... }

  void updateBio(String bio) { ... }
  void uploadAvatar(File f) { ... }

  void subscribe(Plan p) { ... }
  void cancelSubscription() { ... }
  Invoice generateInvoice() { ... }

  void sendNotification(String msg) { ... }
  void markAllRead() { ... }
  List<Notification> getUnread() { ... }
}`,
    goodNote: "Each class now has one clear job. You can read, test, or replace BillingService without touching AuthService.",
    good: `class User {
  String userId, name, email;
  String avatarUrl, bio, location;

  void updateProfile(String bio, String location) { ... }
}

class AuthService {
  boolean login(User u, String password) { ... }
  void logout(User u) { ... }
  void changePassword(User u, String old, String next) { ... }
}

class BillingService {
  void subscribe(User u, Plan plan) { ... }
  void cancel(User u) { ... }
  Invoice generateInvoice(User u) { ... }
}

class NotificationService {
  void send(User u, String message) { ... }
  void markAllRead(User u) { ... }
  List<Notification> getUnread(User u) { ... }
}

class AuditLog {
  void record(User u, String action) { ... }
  List<AuditEvent> history(User u) { ... }
}`
  },
  {
    category: "Bloaters", categoryIcon: "🧱",
    name: "Primitive Obsession",
    subtitle: "Using raw primitives instead of small domain objects",
    explanation: "It feels natural to represent a phone number as a String, or money as a double. But primitives have no behavior — you can't validate them, format them, or enforce rules on them. When your codebase is littered with Strings that mean \"phone numbers\" and doubles that mean \"prices in USD,\" bugs creep in. Tiny value objects cost almost nothing and give you enormous safety.",
    tags: ["Type Safety", "Domain Modeling", "Value Objects"],
    badNote: "Nothing stops a caller from passing a negative price, a malformed phone number, or mixing up USD and EUR.",
    bad: `class Order {
  String customerId;   // format? UUID? email?
  double price;        // USD? EUR? can it be negative?
  String status;       // "active"? "ACTIVE"? all valid?
  String phone;        // "+880..." or "01..."? who validates?
  double discount;     // fraction (0.1) or percent (10)?
}

void ship(String customerId,
          double amount,
          String phone,
          String country) {
  // BUG: amount could be -50.0, nobody checks
  // BUG: phone "abc" passes right through
  sms.send(phone, "Shipping $" + amount);
  payment.charge(customerId, amount);
}

// Accidental swap — compiler won't catch this:
ship(customerPhone, totalPrice, customerId, "USD");`,
    goodNote: "Each domain concept is its own type with validation baked in. The compiler catches argument swaps.",
    good: `class CustomerId {
  private final String value;
  CustomerId(String v) {
    if (!v.matches("USR-\\d{6}"))
      throw new IllegalArgumentException("Bad ID: " + v);
    this.value = v;
  }
  String value() { return value; }
}

class Money {
  private final BigDecimal amount;
  private final Currency currency;

  Money(BigDecimal amount, Currency currency) {
    if (amount.compareTo(BigDecimal.ZERO) < 0)
      throw new IllegalArgumentException("Negative money");
    this.amount = amount;
    this.currency = currency;
  }

  Money add(Money other) {
    if (!currency.equals(other.currency))
      throw new CurrencyMismatchException();
    return new Money(amount.add(other.amount), currency);
  }
}

class PhoneNumber {
  private final String e164;
  PhoneNumber(String raw) {
    this.e164 = PhoneNormalizer.toE164(raw);
  }
  String forSms() { return e164; }
}

// Compiler enforces correctness:
void ship(CustomerId id, Money amount, PhoneNumber phone) {
  sms.send(phone.forSms(), "Shipping " + amount.format());
  payment.charge(id.value(), amount);
}`
  },
  {
    category: "Bloaters", categoryIcon: "🧱",
    name: "Long Parameter List",
    subtitle: "A method that demands too many arguments",
    explanation: "The more parameters a function has, the harder it is to call correctly. With four or more arguments, you start forgetting the order, accidentally swapping values of the same type, and writing calls that look like random number sequences. Long parameter lists usually mean the function is doing too much, or that a group of those parameters naturally belong together as an object.",
    tags: ["API Design", "Readability", "Coupling"],
    badNote: "Eight positional arguments. Can you tell which boolean is emailVerified and which is isAdmin just by looking at the call site?",
    bad: `void createUser(
  String  firstName,
  String  lastName,
  String  email,
  String  password,
  int     age,
  String  role,
  boolean emailVerified,
  boolean isAdmin,
  String  country,
  String  timezone
) { ... }

// Six months later:
createUser(
  "Jane", "Doe",
  "jane@example.com",
  "hunter2",
  28, "ADMIN",
  false,   // emailVerified? isAdmin? nobody knows
  true,    // ← swapped — silent bug
  "US", "UTC"
);`,
    goodNote: "Named fields make the call site self-documenting. Add a new field later without breaking every existing caller.",
    good: `class CreateUserRequest {
  String firstName;
  String lastName;
  String email;
  String password;

  int     age           = 0;
  String  role          = "USER";
  boolean emailVerified = false;
  boolean isAdmin       = false;
  String  country       = "US";
  String  timezone      = "UTC";
}

void createUser(CreateUserRequest req) {
  validateEmail(req.email);
  if (req.isAdmin) requireAdminApproval(req);
}

// Call site reads like a config:
var req = new CreateUserRequest();
req.firstName     = "Jane";
req.lastName      = "Doe";
req.email         = "jane@example.com";
req.password      = "hunter2";
req.role          = "ADMIN";
req.isAdmin       = true;   // unambiguous
createUser(req);`
  },
  {
    category: "Bloaters", categoryIcon: "🧱",
    name: "Data Clumps",
    subtitle: "Groups of data that always travel together but aren't encapsulated",
    explanation: "You notice that three fields — street, city, zipCode — appear together in five different classes and eight different method signatures. They're never used apart. That's not a coincidence, that's a concept trying to become a class. Data clumps are pre-objects waiting to be born. Giving them a home reduces duplication, makes intent clearer, and gives you one place to put validation or utility methods for that group.",
    tags: ["Cohesion", "DRY", "Encapsulation"],
    badNote: "The same four address fields appear in Customer, Order, and Invoice. Rename one and you update three classes.",
    bad: `class Customer {
  String name, email;
  String street, city, zipCode, country; // ← clump
}

class Order {
  int orderId;
  String street, city, zipCode, country; // ← same clump
}

class Invoice {
  double amount;
  String street, city, zipCode, country; // ← same clump again
}

void shipTo(
  String street,
  String city,
  String zipCode,
  String country   // ← four params that always arrive together
) { ... }

void printLabel(
  String street,
  String city,
  String zipCode,
  String country   // ← same four, again
) { ... }`,
    goodNote: "Address is now a first-class concept. Validation, formatting, and future fields live in exactly one place.",
    good: `class Address {
  final String street, city, zipCode, country;

  Address(String street, String city,
          String zipCode, String country) {
    if (zipCode == null || zipCode.length() < 4)
      throw new IllegalArgumentException("Bad zip");
    this.street  = street;
    this.city    = city;
    this.zipCode = zipCode;
    this.country = country;
  }

  String format() {
    return street + "\\n" + city + " "
      + zipCode + "\\n" + country;
  }
}

class Customer {
  String name, email;
  Address billingAddress;   // ← one field, not four
}
class Order {
  int orderId;
  Address shippingAddress;
}

void shipTo(Address addr)     { ... }
void printLabel(Address addr) { ... }`
  },
  {
    category: "OO Abusers", categoryIcon: "🔀",
    name: "Switch Statements",
    subtitle: "Repeated type-checking logic that should live in polymorphism",
    explanation: "A switch on a type field isn't inherently evil, but when that switch appears in five different places — computing price, formatting display, sending notifications, choosing icons — you have a problem. Add a new type and you're hunting through the codebase patching every switch. Polymorphism was designed exactly for this: put the behavior on the types themselves and let dispatch happen automatically.",
    tags: ["Polymorphism", "OCP", "Type Dispatch"],
    badNote: "The same switch logic is duplicated in area(), label(), AND color(). Add a Triangle and you must patch all three.",
    bad: `double area(Shape s) {
  switch (s.type) {
    case "CIRCLE":    return Math.PI * s.r * s.r;
    case "RECTANGLE": return s.w * s.h;
    case "SQUARE":    return s.side * s.side;
    default: throw new RuntimeException("Unknown");
  }
}

String label(Shape s) {
  switch (s.type) {      // ← duplicate switch
    case "CIRCLE":    return "Circle";
    case "RECTANGLE": return "Rectangle";
    case "SQUARE":    return "Square";
    default: throw new RuntimeException("Unknown");
  }
}

String color(Shape s) {
  switch (s.type) {      // ← duplicate switch #3
    case "CIRCLE":    return "#5b8af5";
    case "RECTANGLE": return "#a78bfa";
    case "SQUARE":    return "#34d399";
    default: throw new RuntimeException("Unknown");
  }
}

// Adding Triangle? Edit ALL three methods above.`,
    goodNote: "Each type owns its behavior. Adding Triangle means writing one class — no existing code changes.",
    good: `abstract class Shape {
  abstract double area();
  abstract String label();
  abstract String color();
}

class Circle extends Shape {
  final double r;
  double area()  { return Math.PI * r * r; }
  String label() { return "Circle"; }
  String color() { return "#5b8af5"; }
}

class Rectangle extends Shape {
  final double w, h;
  double area()  { return w * h; }
  String label() { return "Rectangle"; }
  String color() { return "#a78bfa"; }
}

class Square extends Shape {
  final double side;
  double area()  { return side * side; }
  String label() { return "Square"; }
  String color() { return "#34d399"; }
}

// Adding Triangle? One new class. Zero existing edits.
class Triangle extends Shape {
  final double b, h;
  double area()  { return 0.5 * b * h; }
  String label() { return "Triangle"; }
  String color() { return "#fbbf24"; }
}`
  },
  {
    category: "OO Abusers", categoryIcon: "🔀",
    name: "Temporary Field",
    subtitle: "Instance fields that are only set and used in certain scenarios",
    explanation: "A class has a field that sits null 90% of the time, then gets populated inside one specific method, used briefly, and becomes meaningless again. This is hidden state — you can't look at an instance and trust that its fields mean anything without knowing which code path was taken. These temporary values usually belong in a local variable or a dedicated context object.",
    tags: ["State Management", "Null Safety", "Clarity"],
    badNote: "reportLines and reportTitle are null after construction. Any method that accidentally reads them at the wrong time gets a NullPointerException.",
    bad: `class ReportGenerator {

  // These fields are NULL most of the time.
  List<String> reportLines;   // ← null except during export
  String reportTitle;         // ← null except during export
  String reportFooter;        // ← null except during export

  void exportPdf() {
    reportTitle  = "Monthly Report — " + LocalDate.now();
    reportFooter = "Confidential";
    reportLines  = buildLines();

    pdfLib.render(reportTitle, reportLines, reportFooter);

    // Must remember to clean up:
    reportLines  = null;
    reportTitle  = null;
    reportFooter = null;
  }

  void exportCsv() {
    // reportLines is null here!
    csvLib.write(reportLines); // ← CRASH
  }
}`,
    goodNote: "ReportContext bundles the temporary data for exactly one export run. No field ever sits null.",
    good: `class ReportContext {
  final String title;
  final String footer;
  final List<String> lines;

  ReportContext(String title, String footer,
                List<String> lines) {
    this.title  = title;
    this.footer = footer;
    this.lines  = List.copyOf(lines);
  }
}

class ReportGenerator {

  void exportPdf() {
    ReportContext ctx = buildContext();
    pdfLib.render(ctx.title, ctx.lines, ctx.footer);
  }

  void exportCsv() {
    ReportContext ctx = buildContext();
    csvLib.write(ctx.lines);
  }

  private ReportContext buildContext() {
    return new ReportContext(
      "Monthly Report — " + LocalDate.now(),
      "Confidential",
      buildLines()
    );
  }
}`
  },
  {
    category: "OO Abusers", categoryIcon: "🔀",
    name: "Refused Bequest",
    subtitle: "A subclass that inherits methods it doesn't need or want",
    explanation: "Inheritance is a promise: \"I am a kind of you, so I do everything you do.\" Refused Bequest breaks that promise — the subclass inherits a bunch of methods, overrides half of them with empty bodies or exceptions, and silently pretends to be something it isn't. This violates the Liskov Substitution Principle. Usually the fix is to rethink the hierarchy: maybe the relationship should be composition, or the shared behavior should live in an interface.",
    tags: ["LSP", "Inheritance", "Composition"],
    badNote: "ReadOnlyList extends ArrayList but refuses 10+ methods with exceptions. You can pass it anywhere a List is expected and get a runtime crash.",
    bad: `class ReadOnlyList<T> extends ArrayList<T> {

  ReadOnlyList(Collection<T> source) {
    super(source);
  }

  @Override public boolean add(T t) {
    throw new UnsupportedOperationException("Read-only!");
  }
  @Override public void add(int i, T t) {
    throw new UnsupportedOperationException("Read-only!");
  }
  @Override public T remove(int i) {
    throw new UnsupportedOperationException("Read-only!");
  }
  @Override public boolean remove(Object o) {
    throw new UnsupportedOperationException("Read-only!");
  }
  @Override public void clear() {
    throw new UnsupportedOperationException("Read-only!");
  }
  // ...and 8 more overrides just to throw exceptions
}

// Bug: compiles fine, crashes at runtime:
List<String> names = new ReadOnlyList<>(source);
names.add("Alice"); // ← UnsupportedOperationException`,
    goodNote: "ReadableList only exposes what a read-only list actually supports. The compiler rejects mutations before the program runs.",
    good: `interface ReadableList<T> {
  T       get(int index);
  int     size();
  boolean contains(T item);
  boolean isEmpty();
  List<T> snapshot();
}

class ImmutableList<T> implements ReadableList<T> {
  private final List<T> data;

  ImmutableList(Collection<T> source) {
    this.data = List.copyOf(source);
  }

  public T       get(int i)    { return data.get(i); }
  public int     size()        { return data.size(); }
  public boolean contains(T t) { return data.contains(t); }
  public boolean isEmpty()     { return data.isEmpty(); }
  public List<T> snapshot()    { return new ArrayList<>(data); }
}

ReadableList<String> names = new ImmutableList<>(source);
names.get(0);       // ✔ fine
names.add("Alice"); // ✖ COMPILE ERROR`
  },
  {
    category: "OO Abusers", categoryIcon: "🔀",
    name: "Alternative Classes with Different Interfaces",
    subtitle: "Two classes that do the same thing under different names",
    explanation: "You have EmailSender with a send() method and MailDispatcher with a dispatch() method. They do the same job. No one decided to unify them, so both exist and callers have to know which one to use where. This is a missed abstraction — either these classes should share an interface, or one should be removed.",
    tags: ["Abstraction", "Interface Design", "DRY"],
    badNote: "Both classes send emails but have different method names. You can't swap one for the other or mock either cleanly in tests.",
    bad: `// Legacy module
class EmailSender {
  void send(String to, String subject, String body) {
    smtpClient.send(to, subject, body);
  }
}

// Added by a different team later
class MailDispatcher {
  void dispatch(String recipient,
                String title,
                String content) {
    sendGridClient.post(recipient, title, content);
  }
}

// Callers are split across both:
class WelcomeService {
  EmailSender sender = new EmailSender();
  void welcome(User u) {
    sender.send(u.email, "Welcome!", "Hi " + u.name);
  }
}
class InvoiceService {
  MailDispatcher mailer = new MailDispatcher();
  void invoice(User u, Invoice inv) {
    mailer.dispatch(u.email, "Invoice", inv.toString());
  }
}`,
    goodNote: "One interface, two implementations. Swap the implementation in one place, all callers change automatically.",
    good: `interface Mailer {
  void send(String to, String subject, String body);
}

class SmtpMailer implements Mailer {
  public void send(String to, String subject, String body) {
    smtpClient.send(to, subject, body);
  }
}

class SendGridMailer implements Mailer {
  public void send(String to, String subject, String body) {
    sendGridClient.post(to, subject, body);
  }
}

class WelcomeService {
  private final Mailer mailer;
  WelcomeService(Mailer mailer) { this.mailer = mailer; }
  void welcome(User u) {
    mailer.send(u.email, "Welcome!", "Hi " + u.name);
  }
}
// Switch SMTP → SendGrid: change one constructor arg.`
  },
  {
    category: "Change Preventers", categoryIcon: "🔒",
    name: "Divergent Change",
    subtitle: "One class changes for multiple unrelated reasons",
    explanation: "Divergent Change is the flip side of the Single Responsibility Principle violation: one class has to be opened and edited every time you change reporting logic, AND every time payment rules change, AND every time a new file format is supported. The symptom is a class that spans multiple \"reasons to change.\" The fix is to extract cohesive groupings.",
    tags: ["SRP", "Cohesion", "Modularity"],
    badNote: "OrderService is touched when auth logic changes, when report formats change, AND when export destinations change.",
    bad: `class OrderService {

  // REASON 1: Auth rules change
  void loginWithPassword(String email, String pw) { ... }
  void loginWithGoogle(String oauthToken) { ... }
  void loginWithSSO(String samlAssertion) { ... }

  // REASON 2: Report format changes
  void generatePdfReport(DateRange range) { ... }
  void generateCsvReport(DateRange range) { ... }
  void generateExcelReport(DateRange range) { ... }

  // REASON 3: Export destination changes
  void exportToS3(byte[] data, String bucket) { ... }
  void exportToGcs(byte[] data, String bucket) { ... }
  void exportToAzureBlob(byte[] data) { ... }

  // The actual order logic: buried in here
  Order placeOrder(Cart cart) { ... }
  void cancelOrder(String orderId) { ... }
}`,
    goodNote: "Each class opens for exactly one reason. Adding a new report format only touches ReportService.",
    good: `class OrderService {
  Order placeOrder(Cart cart) { ... }
  void cancelOrder(String orderId) { ... }
  OrderStatus status(String orderId) { ... }
}

class AuthService {
  void loginWithPassword(String email, String pw) { ... }
  void loginWithGoogle(String oauthToken) { ... }
  boolean hasPermission(User u, String action) { ... }
}

class ReportService {
  byte[] generatePdf(DateRange range) { ... }
  byte[] generateCsv(DateRange range) { ... }
  byte[] generateExcel(DateRange range) { ... }
}

class ExportService {
  void toS3(byte[] data, String bucket) { ... }
  void toGcs(byte[] data, String bucket) { ... }
  void toAzureBlob(byte[] data) { ... }
}`
  },
  {
    category: "Change Preventers", categoryIcon: "🔒",
    name: "Shotgun Surgery",
    subtitle: "One change requires modifying many unrelated classes",
    explanation: "One conceptual change — say, adding a timestamp to audit logs — forces you to open ten different classes scattered across the codebase. Each of those ten edits is a risk: you might miss one, or introduce a subtle inconsistency. Shotgun Surgery usually signals that behavior which should be centralized has been copy-pasted into many places over time.",
    tags: ["DRY", "Coupling", "Centralization"],
    badNote: "Adding a correlationId to audit logs means opening UserService, OrderService, PaymentService — and hoping you don't miss one.",
    bad: `class UserService {
  void createUser(User u) {
    db.save(u);
    AuditRecord r = new AuditRecord();
    r.action    = "USER_CREATE";
    r.entityId  = u.id;
    r.timestamp = Instant.now();
    // forgot correlationId ← silent gap
    auditDb.insert(r);
  }
}

class OrderService {
  void placeOrder(Order o) {
    db.save(o);
    AuditRecord r = new AuditRecord();
    r.action    = "ORDER_PLACE";
    r.entityId  = o.id;
    r.timestamp = Instant.now();
    // forgot correlationId ← silent gap
    auditDb.insert(r);
  }
}

class PaymentService {
  void charge(Payment p) {
    gateway.charge(p);
    AuditRecord r = new AuditRecord();
    r.action    = "PAYMENT_CHARGE";
    r.entityId  = p.id;
    r.timestamp = Instant.now();
    auditDb.insert(r);
  }
}`,
    goodNote: "Audit logic lives once in AuditService. Adding correlationId means editing one class — all callers get it automatically.",
    good: `class AuditService {
  private final String correlationId;

  AuditService(String correlationId) {
    this.correlationId = correlationId;
  }

  void record(String action, String entityId) {
    AuditRecord r = new AuditRecord();
    r.action        = action;
    r.entityId      = entityId;
    r.timestamp     = Instant.now();
    r.correlationId = correlationId; // one place to add
    auditDb.insert(r);
  }
}

class UserService {
  private final AuditService audit;
  void createUser(User u) {
    db.save(u);
    audit.record("USER_CREATE", u.id);
  }
}

class OrderService {
  private final AuditService audit;
  void placeOrder(Order o) {
    db.save(o);
    audit.record("ORDER_PLACE", o.id);
  }
}

class PaymentService {
  private final AuditService audit;
  void charge(Payment p) {
    gateway.charge(p);
    audit.record("PAYMENT_CHARGE", p.id);
  }
}`
  },
  {
    category: "Change Preventers", categoryIcon: "🔒",
    name: "Parallel Inheritance Hierarchies",
    subtitle: "Every new subclass in one hierarchy demands a matching subclass in another",
    explanation: "You have a Shape hierarchy and a ShapeRenderer hierarchy that must grow in lockstep. Every time you add a new Shape, you must also add a new Renderer. This is coupling across hierarchies that compounds your maintenance burden. The fix is usually to fold the behavior back into the type, or use a pattern like Visitor or Strategy to break the dependency.",
    tags: ["Hierarchy Design", "Coupling", "Visitor Pattern"],
    badNote: "Two hierarchies that must grow in lockstep. Miss a Renderer when adding a Shape and you get a runtime crash.",
    bad: `abstract class Shape { String type; }
class Circle    extends Shape { double r; }
class Rectangle extends Shape { double w, h; }
class Triangle  extends Shape { double b, h; }

abstract class ShapeRenderer {
  abstract void render(Shape s, Graphics g);
}
class CircleRenderer extends ShapeRenderer {
  void render(Shape s, Graphics g) {
    Circle c = (Circle) s; // unsafe cast
    g.drawOval(0, 0, (int)c.r*2, (int)c.r*2);
  }
}
class RectangleRenderer extends ShapeRenderer {
  void render(Shape s, Graphics g) {
    Rectangle r = (Rectangle) s;
    g.drawRect(0, 0, (int)r.w, (int)r.h);
  }
}

// Adding Pentagon?
// Step 1: class Pentagon extends Shape { ... }
// Step 2: class PentagonRenderer extends ShapeRenderer { ... }
// Miss step 2 → runtime crash, no compile warning.`,
    goodNote: "One hierarchy. Each Shape renders itself. Adding Pentagon means one class — no second hierarchy to keep in sync.",
    good: `interface Shape {
  void render(Graphics g);
  double area();
  String label();
}

class Circle implements Shape {
  final double r;
  public void render(Graphics g) {
    g.drawOval(0, 0, (int)(r*2), (int)(r*2));
  }
  public double area()  { return Math.PI * r * r; }
  public String label() { return "Circle"; }
}

class Rectangle implements Shape {
  final double w, h;
  public void render(Graphics g) {
    g.drawRect(0, 0, (int)w, (int)h);
  }
  public double area()  { return w * h; }
  public String label() { return "Rectangle"; }
}

// Adding Pentagon? ONE class, not two:
class Pentagon implements Shape {
  final double side;
  public void render(Graphics g) { /* draw pentagon */ }
  public double area()  { return (side*side * Math.sqrt(25+10*Math.sqrt(5))) / 4; }
  public String label() { return "Pentagon"; }
}`
  },
  {
    category: "Dispensables", categoryIcon: "🗑️",
    name: "Comments",
    subtitle: "Comments that explain what the code does instead of why it does it",
    explanation: "Comments aren't bad by nature — they're bad when they're doing a job that the code itself should do. When you need a comment to explain what a block does, that's often a sign you need a better method name. The worst kind are outdated comments that describe code that no longer exists — they actively mislead. Use comments to explain why, not what.",
    tags: ["Readability", "Self-documenting Code", "Naming"],
    badNote: "Every comment here explains what the next line does — which the code already says. The method name p() tells you nothing.",
    bad: `// process list
void p(List<int[]> a, int t) {
  // loop through all rows
  for (int[] r : a) {
    // go through each element in the row
    for (int v : r) {
      // check if value is over threshold
      if (v > t) {
        // print asterisk for high value
        System.out.print("* ");
      } else {
        // print the value with a space
        System.out.print(v + " ");
      }
    }
    // move to next line after each row
    System.out.println();
  }
}

// calc — computes the thing
double calc(double v, double r, int n) {
  // use the formula
  return v * Math.pow(1 + r/n, n);
}`,
    goodNote: "Method names now tell the whole story. The one remaining comment explains WHY a decision was made.",
    good: `void printBoardHighlightingAbove(List<int[]> board,
                                  int threshold) {
  for (int[] row : board) {
    for (int cell : row) {
      boolean isHot = cell > threshold;
      System.out.print(isHot ? "* " : cell + " ");
    }
    System.out.println();
  }
}

double compoundInterest(double principal,
                        double annualRate,
                        int compoundsPerYear) {
  // Using discrete compounding (not continuous) because
  // the banking partner's contract specifies it explicitly.
  return principal
    * Math.pow(1 + annualRate / compoundsPerYear,
               compoundsPerYear);
}

boolean isAccountActive(User u) {
  return u.status.equals("ACTIVE") && !u.isBanned;
}`
  },
  {
    category: "Dispensables", categoryIcon: "🗑️",
    name: "Duplicate Code",
    subtitle: "The same logic copy-pasted in multiple places",
    explanation: "Duplication is the root of so many bugs. When you copy-paste logic and later find a bug in it, you have to remember every place it lives. You almost certainly won't. DRY — Don't Repeat Yourself — isn't just about elegance, it's about having one authoritative source of truth for every piece of logic.",
    tags: ["DRY", "Maintainability", "Bug Risk"],
    badNote: "The discount logic is copied verbatim in three places. Change the membership discount and you have three files to edit — and you'll miss at least one.",
    bad: `class WebCheckout {
  double calculateTotal(Cart cart) {
    double sub = cart.subtotal();
    if (cart.itemCount > 10)    sub *= 0.90;
    if (cart.hasMembership)     sub *= 0.85;
    if (cart.couponCode != null) sub -= 20;
    return sub + (sub * 0.08);
  }
}

class MobileCheckout {
  double calculateTotal(Cart cart) {
    double sub = cart.subtotal();
    if (cart.itemCount > 10)    sub *= 0.90; // copy
    if (cart.hasMembership)     sub *= 0.85; // copy
    if (cart.couponCode != null) sub -= 20;  // copy
    return sub + (sub * 0.08);
  }
}

class PhoneAgentCheckout {
  double calculateTotal(Cart cart) {
    double sub = cart.subtotal();
    if (cart.itemCount > 10)    sub *= 0.90;
    if (cart.hasMembership)     sub *= 0.80; // ← BUG: 0.85→0.80
    if (cart.couponCode != null) sub -= 20;
    return sub + (sub * 0.08);
  }
}`,
    goodNote: "One authoritative pricing engine. Change the rule once and every channel gets it instantly.",
    good: `class PricingEngine {
  private static final double BULK_DISCOUNT   = 0.90;
  private static final double MEMBER_DISCOUNT = 0.85;
  private static final double COUPON_VALUE    = 20.00;
  private static final double TAX_RATE        = 0.08;

  double calculateTotal(Cart cart) {
    double sub = cart.subtotal();
    if (cart.itemCount > 10)      sub *= BULK_DISCOUNT;
    if (cart.hasMembership)       sub *= MEMBER_DISCOUNT;
    if (cart.couponCode != null)  sub -= COUPON_VALUE;
    return sub + (sub * TAX_RATE);
  }
}

// All channels delegate — zero pricing logic of their own:
class WebCheckout {
  private final PricingEngine pricing;
  double calculateTotal(Cart c) {
    return pricing.calculateTotal(c);
  }
}
class MobileCheckout {
  private final PricingEngine pricing;
  double calculateTotal(Cart c) {
    return pricing.calculateTotal(c);
  }
}
// Change MEMBER_DISCOUNT once → all channels updated.`
  },
  {
    category: "Dispensables", categoryIcon: "🗑️",
    name: "Lazy Class",
    subtitle: "A class that doesn't do enough to justify its existence",
    explanation: "Every class you add is a class someone has to understand. If a class exists to wrap a single method, or to hold one field, and nothing about its lifecycle or purpose makes it truly necessary, it's just overhead. Maybe it was created in anticipation of future growth that never came. YAGNI — You Aren't Gonna Need It. If it doesn't earn its place, inline its logic and delete it.",
    tags: ["Simplicity", "YAGNI", "Overhead"],
    badNote: "NameFormatter is a whole class, a whole file, a whole import — for one trivial string concatenation.",
    bad: `class NameFormatter {
  // This is it. This is the entire class.
  String format(String firstName, String lastName) {
    return lastName + ", " + firstName;
  }
}

class UserGreeter {
  private NameFormatter formatter = new NameFormatter();

  String greet(User u) {
    String name = formatter.format(u.firstName, u.lastName);
    return "Welcome, " + name + "!";
  }
}

// To understand greet(), open TWO files, trace
// through TWO classes, to see:
//   lastName + ", " + firstName
// That's it.

class UserController {
  private UserGreeter greeter = new UserGreeter();
  void showWelcome(User u) {
    System.out.println(greeter.greet(u));
  }
}`,
    goodNote: "Behavior moves into User where it belongs. Two unnecessary classes eliminated.",
    good: `class User {
  final String firstName, lastName, email;

  String displayName() {
    return lastName + ", " + firstName;
  }

  String welcomeMessage() {
    return "Welcome, " + displayName() + "!";
  }
}

class UserController {
  void showWelcome(User u) {
    System.out.println(u.welcomeMessage());
  }
}

// NameFormatter: deleted.
// UserGreeter:   deleted.
// Two fewer files. Same outcome.`
  },
  {
    category: "Dispensables", categoryIcon: "🗑️",
    name: "Data Class",
    subtitle: "A class with fields and getters/setters but no real behavior",
    explanation: "A Data Class is just a bag of data — fields, getters, setters — and nothing else. Other classes manipulate it externally. This violates encapsulation: the data and the logic that belongs with it are separated. Often the behavior that operates on the data class should be moved into it. Simple DTOs at system boundaries are fine — but inside your domain model, a class without behavior is a missed opportunity.",
    tags: ["Encapsulation", "Behavior", "Domain Model"],
    badNote: "Rectangle is pure data. AreaCalculator, PerimeterCalculator, and SquareChecker all know about Rectangle's internals.",
    bad: `class Rectangle {
  private double width;
  private double height;

  public double getWidth()  { return width; }
  public double getHeight() { return height; }
  public void setWidth(double w)  { this.width = w; }
  public void setHeight(double h) { this.height = h; }
  // No behavior. Just getters and setters.
}

class AreaCalculator {
  double calculate(Rectangle r) {
    return r.getWidth() * r.getHeight();
  }
}
class PerimeterCalculator {
  double calculate(Rectangle r) {
    return 2 * (r.getWidth() + r.getHeight());
  }
}
class SquareChecker {
  boolean isSquare(Rectangle r) {
    return r.getWidth() == r.getHeight();
  }
}
class RectangleScaler {
  Rectangle scale(Rectangle r, double factor) {
    Rectangle scaled = new Rectangle();
    scaled.setWidth(r.getWidth() * factor);
    scaled.setHeight(r.getHeight() * factor);
    return scaled;
  }
}`,
    goodNote: "Rectangle knows what it is and what it can do. Four external classes collapse into four methods.",
    good: `class Rectangle {
  private final double width;
  private final double height;

  Rectangle(double width, double height) {
    if (width <= 0 || height <= 0)
      throw new IllegalArgumentException("Positive only");
    this.width  = width;
    this.height = height;
  }

  double area()      { return width * height; }
  double perimeter() { return 2 * (width + height); }
  boolean isSquare() {
    return Double.compare(width, height) == 0;
  }
  double diagonal()  { return Math.hypot(width, height); }

  Rectangle scale(double factor) {
    return new Rectangle(width * factor, height * factor);
  }

  @Override public String toString() {
    return String.format("Rectangle(%.1f × %.1f)", width, height);
  }
}

// Usage:
Rectangle r = new Rectangle(4, 4);
System.out.println(r.area());      // 16.0
System.out.println(r.isSquare()); // true
System.out.println(r.scale(2));   // Rectangle(8.0 × 8.0)`
  },
  {
    category: "Dispensables", categoryIcon: "🗑️",
    name: "Dead Code",
    subtitle: "Code that is never executed and serves no purpose",
    explanation: "Dead code is code that can never be reached: a method no one calls, a branch that's always false, a variable assigned but never read. It clutters the codebase and makes readers wonder if they're missing something. Version control exists precisely so you can delete with confidence — the history is always there if you need to revisit.",
    tags: ["Cleanliness", "Complexity", "Cognitive Load"],
    badNote: "Three forms of dead code: an unreachable else branch, a deprecated method nobody calls, and a field assigned but never read.",
    bad: `class PaymentProcessor {

  // Dead field: assigned, never read
  private boolean legacyModeEnabled = false;

  void process(Payment p) {
    // p.amount is always positive before this call
    if (p.amount > 0) {
      chargeCard(p);
    } else {
      // DEAD: this branch can never execute
      logger.warn("Negative amount: " + p.amount);
      refundDesk.queue(p);
    }
  }

  // Dead method: removed from all callers in 2022
  @Deprecated
  void processLegacy(Payment p) {
    // Old V1 gateway — decommissioned Jan 2022.
    // Kept "just in case" for 2+ years.
    oldGateway.charge(p.cardNumber, p.amount);
  }

  // Dead method: fraud check pilot ended Q3 2023
  boolean runExperimentalFraudCheck(Payment p) {
    return fraudEngine.deepScan(p);
  }
}`,
    goodNote: "Only live, reachable code remains. Git history preserves everything that was deleted.",
    good: `class PaymentProcessor {

  // No stale fields. No deprecated methods.
  // No unreachable branches.

  void process(Payment p) {
    // Precondition guaranteed by PaymentValidator:
    // p.amount > 0 always holds here.
    chargeCard(p);
  }

  private void chargeCard(Payment p) {
    ChargeResult result = gateway.charge(p.token, p.amount);
    if (!result.success()) {
      throw new PaymentFailedException(result.errorCode());
    }
    auditLog.record("PAYMENT_CHARGED", p.id);
  }
}

// processLegacy()             → deleted (git: commit a3f91c)
// runExperimentalFraudCheck() → deleted (git: commit b7d204)
// legacyModeEnabled           → deleted (git: commit b7d204)`
  },
  {
    category: "Dispensables", categoryIcon: "🗑️",
    name: "Speculative Generality",
    subtitle: "Abstraction added for imagined future needs that never arrive",
    explanation: "\"We might need to support multiple databases someday\" — so a 5-class abstraction layer gets built. Years later, there's only ever been one database, and new developers have to wade through four interfaces and two abstract classes to understand one SQL query. YAGNI — You Aren't Gonna Need It. Build for what you need today. Pre-emptive abstraction is technical debt paid before any value is received.",
    tags: ["YAGNI", "Over-engineering", "Simplicity"],
    badNote: "Five classes to send one email. Every call bounces through AbstractMessageSender → AbstractAsyncSender. There is exactly one provider.",
    bad: `interface MessageTransport {
  void transmit(TransportPayload payload);
}
interface MessageFormatter {
  TransportPayload format(String to, String subj, String body);
}
abstract class AbstractMessageSender {
  protected MessageTransport transport;
  protected MessageFormatter formatter;
  abstract void send(String to, String subj, String body);
}
abstract class AbstractAsyncSender
    extends AbstractMessageSender {
  abstract void sendAsync(String to, String subj, String body);
}

// The one actual implementation:
class SmtpEmailSender extends AbstractAsyncSender
    implements MessageTransport {

  void send(String to, String subj, String body) {
    TransportPayload p = formatter.format(to, subj, body);
    transmit(p);
  }
  void sendAsync(String to, String subj, String body) {
    executor.submit(() -> send(to, subj, body));
  }
  public void transmit(TransportPayload p) {
    smtpClient.send(p.to, p.subject, p.body);
  }
}

// 5 types. 1 real provider. 0 plans to add another.`,
    goodNote: "One class does the job. If a second provider is ever needed, extract the interface then — with real requirements.",
    good: `class EmailService {
  private final SmtpClient smtp;
  private final String defaultFromAddress;

  EmailService(SmtpClient smtp, String from) {
    this.smtp               = smtp;
    this.defaultFromAddress = from;
  }

  void send(String to, String subject, String body) {
    smtp.send(defaultFromAddress, to, subject, body);
  }

  void sendAsync(String to, String subject, String body) {
    CompletableFuture.runAsync(
      () -> send(to, subject, body)
    );
  }
}

// When a second provider is actually needed,
// extract an interface at that point:
//   interface Mailer { void send(...); }
//   class SmtpMailer   implements Mailer { ... }
//   class TwilioMailer implements Mailer { ... }
// Real requirements → better abstraction.`
  },
  {
    category: "Couplers", categoryIcon: "🔗",
    name: "Feature Envy",
    subtitle: "A method that is more interested in another class's data than its own",
    explanation: "A method that keeps reaching into another object to grab its data is a method that belongs somewhere else. If calculateShipping() lives in Order but spends all its time calling customer.getAddress().getCountry(), customer.getMembership().getTier(), and customer.isPrime() — it envies Customer. Methods should work with the data of the class they live in.",
    tags: ["Coupling", "Cohesion", "Law of Demeter"],
    badNote: "calculateShipping() lives in Order but touches 6 things from Customer. It belongs somewhere else.",
    bad: `class Order {
  Customer customer;
  List<Item> items;
  double subtotal;

  // This method is jealous of Customer:
  double calculateShipping() {
    String country    = customer.getAddress().getCountry();
    String state      = customer.getAddress().getState();
    String tier       = customer.getMembership().getTier();
    boolean isPrime   = customer.getMembership().isPrime();
    boolean hasWaived = customer.getShippingWaiver().isActive();
    int orderCount    = customer.getOrderHistory().size();

    if (isPrime || hasWaived) return 0.0;

    double base = country.equals("US") ? 5.99 : 24.99;
    if (state.equals("HI") || state.equals("AK")) base += 10;
    if (tier.equals("GOLD"))   base *= 0.70;
    if (tier.equals("SILVER")) base *= 0.85;
    if (orderCount > 50)       base *= 0.90;

    return base;
  }
}`,
    goodNote: "shippingRate() moves to Customer where all the data already lives. Order makes one clean call.",
    good: `class Customer {
  private final Address address;
  private final Membership membership;
  private final ShippingWaiver waiver;
  private final List<Order> orderHistory;

  // Shipping logic belongs HERE:
  double shippingRate() {
    if (membership.isPrime() || waiver.isActive())
      return 0.0;

    String country = address.getCountry();
    String state   = address.getState();
    String tier    = membership.getTier();
    int    orders  = orderHistory.size();

    double base = country.equals("US") ? 5.99 : 24.99;
    if (state.equals("HI") || state.equals("AK")) base += 10;
    if (tier.equals("GOLD"))   base *= 0.70;
    if (tier.equals("SILVER")) base *= 0.85;
    if (orders > 50)           base *= 0.90;

    return base;
  }
}

class Order {
  Customer customer;
  List<Item> items;

  // One clean call — no envy:
  double calculateShipping() {
    return customer.shippingRate();
  }
}`
  },
  {
    category: "Couplers", categoryIcon: "🔗",
    name: "Inappropriate Intimacy",
    subtitle: "Two classes that know too much about each other's internals",
    explanation: "Some classes become like clingy friends — they dig into each other's private fields, call each other's internal helpers, and get entangled at every level. This makes them impossible to change independently. Classes should communicate through clean, public interfaces — not back-channel intimacy.",
    tags: ["Encapsulation", "Coupling", "Interface Design"],
    badNote: "OrderProcessor directly reads and mutates InventoryManager's private fields. Any refactor of InventoryManager breaks OrderProcessor immediately.",
    bad: `class InventoryManager {
  // Package-private so OrderProcessor can reach in:
  Map<String, Integer> stockMap = new HashMap<>();
  Order lastProcessedOrder;    // internal bookkeeping
  int totalReservations = 0;
  boolean lowStockAlertSent = false;
}

class OrderProcessor {
  InventoryManager inventory;

  void process(Order order) {
    Map<String, Integer> stock = inventory.stockMap; // private!

    for (Item item : order.items) {
      int available = stock.getOrDefault(item.sku, 0);
      if (available < item.qty)
        throw new OutOfStockException(item.sku);

      stock.put(item.sku, available - item.qty);    // dangerous
      inventory.totalReservations += item.qty;       // internal!
      inventory.lowStockAlertSent = false;            // internal!
    }
    inventory.lastProcessedOrder = order;             // internal!
  }
}`,
    goodNote: "InventoryManager owns its state completely. Either class can be refactored internally without touching the other.",
    good: `class InventoryManager {
  private final Map<String, Integer> stockMap = new HashMap<>();
  private int totalReservations = 0;

  boolean hasStock(String sku, int qty) {
    return stockMap.getOrDefault(sku, 0) >= qty;
  }

  void reserve(String sku, int qty) {
    if (!hasStock(sku, qty))
      throw new OutOfStockException(sku);
    stockMap.merge(sku, -qty, Integer::sum);
    totalReservations += qty;
    checkLowStockThreshold(sku);
  }

  private void checkLowStockThreshold(String sku) {
    if (stockMap.getOrDefault(sku, 0) < 5) alertOps(sku);
  }
}

class OrderProcessor {
  private final InventoryManager inventory;

  void process(Order order) {
    for (Item item : order.items) {
      inventory.reserve(item.sku, item.qty); // clean call
    }
  }
}`
  },
  {
    category: "Couplers", categoryIcon: "🔗",
    name: "Message Chains",
    subtitle: "A long chain of calls navigating through intermediate objects",
    explanation: "a.getB().getC().getD().doSomething() — each dot is a dependency on the internal structure of the object before it. Change any link and the chain breaks. It's a violation of the Law of Demeter: a method should only talk to its immediate collaborators, not navigate deep into their object graphs.",
    tags: ["Law of Demeter", "Coupling", "Navigation"],
    badNote: "The controller knows that an Order has a Customer, a Customer has an Address, and an Address has a Country. Change any relationship and the controller breaks.",
    bad: `class OrderController {

  void displayOrderSummary(Order order) {

    // Chain 1: 4 hops
    String countryCode = order
      .getCustomer()
      .getAddress()
      .getCountry()
      .getIsoCode();

    // Chain 2: 4 hops
    double multiplier = order
      .getCustomer()
      .getMembership()
      .getDiscount()
      .getShippingMultiplier();

    // Chain 3: 5 hops
    String supportTier = order
      .getCustomer()
      .getMembership()
      .getSubscription()
      .getTier()
      .getLabel();

    // Chain 4: 4 hops
    String warehouse = order
      .getItems().get(0)
      .getProduct()
      .getInventory()
      .getPrimaryWarehouse();

    renderSummary(countryCode, multiplier,
                  supportTier, warehouse);
  }
}`,
    goodNote: "Each class hides its navigation internally. The controller only talks to Order.",
    good: `class Order {
  private final Customer customer;
  private final List<Item> items;

  String customerCountryCode() {
    return customer.countryCode();
  }
  double shippingMultiplier() {
    return customer.shippingMultiplier();
  }
  String customerSupportTier() {
    return customer.supportTierLabel();
  }
  String primaryWarehouse() {
    return items.isEmpty() ? "NONE"
      : items.get(0).primaryWarehouse();
  }
}

class Customer {
  private final Address address;
  private final Membership membership;

  String countryCode()        { return address.countryIsoCode(); }
  double shippingMultiplier() { return membership.shippingMultiplier(); }
  String supportTierLabel()   { return membership.supportTierLabel(); }
}

// Controller only talks to ONE object:
class OrderController {
  void displayOrderSummary(Order order) {
    renderSummary(
      order.customerCountryCode(),
      order.shippingMultiplier(),
      order.customerSupportTier(),
      order.primaryWarehouse()
    );
  }
}`
  },
  {
    category: "Couplers", categoryIcon: "🔗",
    name: "Middle Man",
    subtitle: "A class that exists only to delegate to another class",
    explanation: "Delegation is fine when a class adds value on top of what it delegates to. But when a class has ten methods and every single one just calls the same method on another object — it's a Middle Man. It adds a layer of indirection with no benefit, just extra files to navigate and extra confusion about why it exists.",
    tags: ["Indirection", "Simplicity", "Delegation"],
    badNote: "PersonService has 8 methods. Every single one just calls the same method on Person. Zero logic added.",
    bad: `class PersonService {
  private final Person person;
  PersonService(Person p) { this.person = p; }

  // 8 methods, 8 pure pass-throughs:
  String  getName()         { return person.getName(); }
  void    setName(String n) { person.setName(n); }
  int     getAge()          { return person.getAge(); }
  void    setAge(int a)     { person.setAge(a); }
  String  getEmail()        { return person.getEmail(); }
  void    setEmail(String e){ person.setEmail(e); }
  String  getPhone()        { return person.getPhone(); }
  void    setPhone(String p){ person.setPhone(p); }
}

class ProfileController {
  private final PersonService personService;

  void showProfile() {
    // Must know TWO classes just to get a name:
    String name  = personService.getName();  // → Person.getName()
    int    age   = personService.getAge();   // → Person.getAge()
    render(name, age);
  }
}`,
    goodNote: "Talk to Person directly. Delegation IS valid when it adds something — caching or authorization, for example.",
    good: `// No middle man — talk to Person directly:
class ProfileController {
  private final Person person;

  void showProfile() {
    render(person.getName(), person.getAge(), person.getEmail());
  }
}

// Middle Man IS valid when it adds real value:
class CachedPersonService {
  private final Person person;
  private final Cache  cache;

  // This delegate actually DOES something:
  String getName() {
    return cache.getOrLoad(
      "person:" + person.getId() + ":name",
      () -> person.getName()   // ← adds caching
    );
  }

  // Authorization is another valid reason:
  void setEmail(User caller, String email) {
    if (!caller.can("EDIT_PROFILE", person))
      throw new AccessDeniedException();
    person.setEmail(email);    // ← adds auth check
  }
}`
  },
  {
    category: "Couplers", categoryIcon: "🔗",
    name: "Incomplete Library Class",
    subtitle: "A library class that doesn't provide what you need, so you hack around it",
    explanation: "You're using a third-party library and it almost does what you need — but not quite. So you start writing static utility methods that operate on library objects, or you subclass library classes to bolt on missing behavior. These hacks accumulate. When the library updates, they break. The cleaner solution is to wrap the library in your own abstraction (Adapter pattern) so your additions live in a controlled, maintainable place.",
    tags: ["Library Integration", "Adapter Pattern", "Encapsulation"],
    badNote: "Static utility methods all depend on Apache Pair's internals. Upgrade the library and every PairUtils method might break.",
    bad: `// Using Apache Commons Pair, but it's missing methods.
// So we hack around it with static utilities:

class PairUtils {
  static <A,B> boolean hasNullValue(Pair<A,B> p) {
    return p.getLeft() == null || p.getRight() == null;
  }

  static <A,B> String format(Pair<A,B> p) {
    return p.getLeft() + " → " + p.getRight();
  }

  static <A,B> Pair<B,A> swap(Pair<A,B> p) {
    return Pair.of(p.getRight(), p.getLeft());
  }

  static <A> boolean unorderedEqual(
      Pair<A,A> p1, Pair<A,A> p2) {
    return (p1.getLeft().equals(p2.getLeft()) &&
            p1.getRight().equals(p2.getRight()))
        || (p1.getLeft().equals(p2.getRight()) &&
            p1.getRight().equals(p2.getLeft()));
  }
}

// Apache Pair is now baked into every caller.`,
    goodNote: "KeyValuePair wraps the library. Swap Apache Commons for anything by editing one class.",
    good: `class KeyValuePair<K, V> {
  private final K key;
  private final V value;

  KeyValuePair(K key, V value) {
    this.key   = key;
    this.value = value;
  }

  K key()   { return key; }
  V value() { return value; }

  boolean hasNullValue() {
    return key == null || value == null;
  }

  String format() {
    return key + " → " + value;
  }

  KeyValuePair<V, K> swap() {
    return new KeyValuePair<>(value, key);
  }

  static <K,V> KeyValuePair<K,V> of(K k, V v) {
    return new KeyValuePair<>(k, v);
  }

  @Override public String toString() { return format(); }
}

// Usage: clean, no library leaking into callers:
var pair = KeyValuePair.of("userId", "USR-001");
System.out.println(pair.format());       // userId → USR-001
System.out.println(pair.hasNullValue()); // false
var swapped = pair.swap();
// Swap Apache Commons: edit ONE class.`
  },
];

const categories: Array<{ name: string; icon: string; items: CodeSmell[] }> = [];
const catMap: Record<string, { name: string; icon: string; items: CodeSmell[] }> = {};
smells.forEach((s, i) => {
  if (!catMap[s.category]) {
    catMap[s.category] = { name: s.category, icon: s.categoryIcon, items: [] };
    categories.push(catMap[s.category]);
  }
  catMap[s.category].items.push({ ...s, _index: i });
});

const COLORS = {
  bg: "#0f1117",
  sidebar: "#161b27",
  card: "#1a2035",
  border: "#252d40",
  accent: "#5b8af5",
  accent2: "#a78bfa",
  accent3: "#34d399",
  text: "#e2e8f0",
  muted: "#7a8ba6",
  codeBg: "#0d1117",
  tagBg: "#1e2d4a",
  bad: "#f87171",
  good: "#34d399",
};

function CodeBlock({ code, variant, note }) {
  const isBad = variant === "bad";
  const labelColor = isBad ? COLORS.bad : COLORS.good;
  const labelBg = isBad ? "rgba(248,113,113,0.10)" : "rgba(52,211,153,0.10)";
  const labelBorder = isBad ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)";

  return (
    <div style={{ display: "flex", flexDirection: "column", borderTop: isBad ? "none" : `2px solid ${COLORS.border}` }}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 18px", background: labelBg,
        borderBottom: `1px solid ${labelBorder}`,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: labelColor, boxShadow: `0 0 6px ${labelColor}`,
            display: "inline-block", flexShrink: 0,
          }} />
          <span style={{ color: labelColor, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
            {isBad ? "Smelly" : "Refactored"}
          </span>
        </div>
        <span style={{ color: COLORS.muted, fontSize: 12, fontStyle: "italic", lineHeight: 1.4 }}>{note}</span>
      </div>
      <pre style={{
        margin: 0, padding: "20px 22px",
        background: COLORS.codeBg,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13, lineHeight: 1.75, color: "#c9d4e8",
        overflowX: "auto", whiteSpace: "pre",
      }}>
        {code}
      </pre>
    </div>
  );
}

function SmellDetail({ smell, total, onPrev, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COLORS.accent2, marginBottom: 6 }}>
          {smell.categoryIcon} {smell.category}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, color: COLORS.text, marginBottom: 6 }}>
          {smell.name}
        </div>
        <div style={{ fontSize: 14, color: COLORS.muted, fontStyle: "italic" }}>{smell.subtitle}</div>
      </div>

      {/* Explanation */}
      <Section title="What it is">
        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderLeft: `3px solid ${COLORS.accent2}`,
          borderRadius: 10, padding: "16px 20px",
          color: "#c9d4e8", fontSize: 14, lineHeight: 1.8,
        }}>
          {smell.explanation}
        </div>
      </Section>

      {/* Tags */}
      <Section title="Signals">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {smell.tags.map(t => (
            <span key={t} style={{
              fontSize: 12, background: COLORS.tagBg,
              border: `1px solid ${COLORS.border}`, color: COLORS.accent,
              padding: "3px 10px", borderRadius: 20, fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
      </Section>

      {/* Code */}
      <Section title="Code Example">
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
          <CodeBlock code={smell.bad} variant="bad" note={smell.badNote} />
          <CodeBlock code={smell.good} variant="good" note={smell.goodNote} />
        </div>
      </Section>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
        <NavBtn onClick={onPrev} disabled={smell._index === 0}>← Previous</NavBtn>
        <span style={{ margin: "0 auto", fontSize: 12, color: COLORS.muted }}>
          {smell._index + 1} / {total}
        </span>
        <NavBtn onClick={onNext} disabled={smell._index === total - 1}>Next →</NavBtn>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COLORS.muted }}>
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      </div>
      {children}
    </div>
  );
}

function NavBtn({ onClick, disabled, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.card,
        border: `1px solid ${hovered && !disabled ? COLORS.accent : COLORS.border}`,
        color: hovered && !disabled ? COLORS.accent : COLORS.muted,
        padding: "8px 16px", borderRadius: 8, fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        fontFamily: "inherit", transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [activeIndex, setActiveIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SIDEBAR_W = 240;
  const HEADER_H = 54;

  function showSmell(i) {
    setActiveIndex(i);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }

  const activeSmell = activeIndex !== null ? smells[activeIndex] : null;

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.65 }}>
      {/* Header */}
      <header style={{
        height: HEADER_H, background: COLORS.sidebar,
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex", alignItems: "center", padding: "0 20px", gap: 12,
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      }}>
        <span style={{ fontSize: 20 }}>🦨</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Code Smells</div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>All 24 — explained with examples</div>
        </div>
        <span style={{
          marginLeft: "auto", fontSize: 12, color: COLORS.muted,
          background: COLORS.tagBg, padding: "3px 10px",
          borderRadius: 20, border: `1px solid ${COLORS.border}`,
        }}>
          24 smells
        </span>
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            display: "none", background: "none", border: "none",
            color: COLORS.muted, fontSize: 20, cursor: "pointer",
            padding: "4px 8px",
          }}
          className="hamburger"
        >
          ☰
        </button>
      </header>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: ${sidebarOpen ? "block" : "none"} !important; position: fixed !important; z-index: 90 !important; }
          .hamburger { display: block !important; }
          .main-content { margin-left: 0 !important; }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Sidebar */}
      <aside className="sidebar" style={{
        width: SIDEBAR_W, background: COLORS.sidebar,
        borderRight: `1px solid ${COLORS.border}`,
        position: "fixed", top: HEADER_H, bottom: 0,
        overflowY: "auto", padding: "16px 0 40px",
      }}>
        {categories.map(cat => (
          <div key={cat.name}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", color: COLORS.muted,
              padding: "10px 16px 4px", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 8 }}>▼</span>
              {cat.icon} {cat.name}
            </div>
            {cat.items.map(smell => {
              const isActive = activeIndex === smell._index;
              return (
                <button
                  key={smell.name}
                  onClick={() => showSmell(smell._index)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "7px 16px 7px 28px",
                    background: isActive ? "rgba(91,138,245,0.12)" : "none",
                    border: "none",
                    borderLeft: `2px solid ${isActive ? COLORS.accent : "transparent"}`,
                    color: isActive ? COLORS.accent : COLORS.muted,
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = COLORS.text; e.currentTarget.style.background = "rgba(91,138,245,0.07)"; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = COLORS.muted; e.currentTarget.style.background = "none"; } }}
                >
                  {smell.name}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* Main */}
      <main className="main-content" style={{
        marginLeft: SIDEBAR_W, marginTop: HEADER_H,
        padding: "40px 48px 80px",
        minHeight: `calc(100vh - ${HEADER_H}px)`,
      }}>
        {!activeSmell ? (
          <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 24, paddingTop: 20 }}>
            <div>
              <h1 style={{
                fontSize: 32, fontWeight: 800, marginBottom: 12,
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Code Smells
              </h1>
              <p style={{ color: COLORS.muted, fontSize: 15, lineHeight: 1.75 }}>
                Signs in source code that something might be wrong. They're not bugs — they're patterns that hint at deeper design problems. Each smell comes with a realistic before/after so you can see exactly what the problem looks like and what the fix achieves.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
              {categories.map(cat => (
                <div
                  key={cat.name}
                  onClick={() => showSmell(cat.items[0]._index)}
                  style={{
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: 20, cursor: "pointer",
                    transition: "border-color 0.2s, transform 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = "none"; }}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{cat.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{cat.items.length} smells</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 860 }}>
            <SmellDetail
              smell={activeSmell}
              total={smells.length}
              onPrev={() => showSmell(activeIndex - 1)}
              onNext={() => showSmell(activeIndex + 1)}
            />
          </div>
        )}
      </main>
    </div>
  );
}