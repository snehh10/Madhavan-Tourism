from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from datetime import datetime
import json
import uuid
import hashlib
from database.db import get_db_connection
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

# Helper function for database queries
def dictfetchall(cursor):
    """Return all rows from a cursor as a dict"""
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

def sync_bus_seats(cursor, bus_id):
    """Ensure all seats for a bus exist in seat_master based on total_seats in bus_master."""
    cursor.execute("SELECT total_seats FROM bus_master WHERE bus_id = %s", (bus_id,))
    bus = cursor.fetchone()
    if not bus:
        return
    total_seats = int(bus['total_seats'])
    
    cursor.execute("SELECT seat_id, seat_no FROM seat_master WHERE bus_id = %s", (bus_id,))
    existing_seats = cursor.fetchall()
    existing_count = len(existing_seats)
    
    if existing_count == total_seats:
        return
        
    if existing_count < total_seats:
        # Insert missing seats
        existing_numbers = {int(s['seat_no']) for s in existing_seats if s['seat_no'].isdigit()}
        for seat_no in range(1, total_seats + 1):
            if seat_no not in existing_numbers:
                cursor.execute("""
                    INSERT INTO seat_master (bus_id, seat_no, seat_type, status)
                    VALUES (%s, %s, 'REGULAR', 'AVAILABLE')
                """, (bus_id, str(seat_no)))
    else:
        # In case seat count is higher than bus_master.total_seats, update bus_master
        cursor.execute("""
            UPDATE bus_master 
            SET total_seats = %s 
            WHERE bus_id = %s
        """, (existing_count, bus_id))

# ==================== FIXED ADMIN LOGIN API (CHANGED) ====================
@csrf_exempt
@require_http_methods(["POST"])
def admin_login(request):
    """Admin login API - FIXED VERSION"""
    try:
        # Parse JSON body
        data = json.loads(request.body.decode('utf-8'))
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        # Validate input
        if not username or not password:
            return JsonResponse({
                "success": False,
                "error": "Username and password are required"
            }, status=400)
        
        # Get database connection
        connection = get_db_connection()
        cursor = connection.cursor()
        
        try:
            # Query admin from database
            cursor.execute("""
                SELECT admin_id, full_name, username, password, mobile, email, status
                FROM admin_master 
                WHERE username = %s
            """, (username,))
            
            admin = cursor.fetchone()
            
            # Check if admin exists
            if not admin:
                return JsonResponse({
                    "success": False,
                    "error": "Invalid username or password"
                }, status=401)
            
            # Check if account is active
            if admin['status'] != 'ACTIVE':
                return JsonResponse({
                    "success": False,
                    "error": "Account is inactive. Please contact administrator."
                }, status=401)
            
            # Verify password (plain text comparison)
            if admin['password'] != password:
                return JsonResponse({
                    "success": False,
                    "error": "Invalid username or password"
                }, status=401)
            
            # Generate simple token for session
            token_string = f"{admin['admin_id']}_{admin['username']}_{datetime.now().timestamp()}"
            token = hashlib.md5(token_string.encode()).hexdigest()
            
            # Store in session
            request.session['admin_id'] = admin['admin_id']
            request.session['admin_name'] = admin['full_name']
            request.session['admin_username'] = admin['username']
            request.session['admin_token'] = token
            request.session.save()
            
            # Return success response
            return JsonResponse({
                "success": True,
                "message": "Login successful",
                "token": token,
                "admin": {
                    "id": admin['admin_id'],
                    "name": admin['full_name'],
                    "username": admin['username'],
                    "email": admin.get('email', ''),
                    "mobile": admin.get('mobile', '')
                }
            })
            
        except Exception as e:
            print(f"Database error: {str(e)}")
            return JsonResponse({
                "success": False,
                "error": f"Database error: {str(e)}"
            }, status=500)
        finally:
            cursor.close()
            connection.close()
            
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "error": "Invalid JSON data"
        }, status=400)
    except Exception as e:
        print(f"Login error: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": f"Server error: {str(e)}"
        }, status=500)

# ==================== ADMIN LOGOUT ====================
@csrf_exempt
@require_http_methods(["POST"])
def admin_logout(request):
    """Admin logout API"""
    request.session.flush()
    return JsonResponse({
        "success": True,
        "message": "Logged out successfully"
    })

# ==================== PACKAGE APIS ====================
@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def packages(request, package_id=None):
    if request.method == "GET":
        connection = get_db_connection()
        cursor = connection.cursor()
        try:
            if package_id:
                cursor.execute("""
                    SELECT p.*, 
                           s.schedule_id, s.bus_id, s.travel_date, s.return_date,
                           b.bus_name, b.bus_number, b.total_seats
                    FROM package_master p 
                    LEFT JOIN schedule_master s ON p.package_id = s.package_id
                    LEFT JOIN bus_master b ON s.bus_id = b.bus_id
                    WHERE p.package_id = %s AND p.status = 'ACTIVE'
                """, (package_id,))
                package = cursor.fetchone()
                if package:
                    if package.get('price'):
                        package['price'] = float(package['price'])
                    if package.get('travel_date'):
                        package['travel_date'] = str(package['travel_date'])
                    if package.get('return_date'):
                        package['return_date'] = str(package['return_date'])
                return JsonResponse({"success": True, "data": package})
            else:
                cursor.execute("""
                    SELECT p.*, 
                           s.schedule_id, s.bus_id, s.travel_date, s.return_date,
                           b.bus_name, b.bus_number, b.total_seats
                    FROM package_master p 
                    LEFT JOIN schedule_master s ON p.package_id = s.package_id
                    LEFT JOIN bus_master b ON s.bus_id = b.bus_id
                    WHERE p.status = 'ACTIVE' 
                    ORDER BY p.created_at DESC
                """)
                packages = cursor.fetchall()
                for pkg in packages:
                    if pkg.get('price'):
                        pkg['price'] = float(pkg['price'])
                    if pkg.get('travel_date'):
                        pkg['travel_date'] = str(pkg['travel_date'])
                    if pkg.get('return_date'):
                        pkg['return_date'] = str(pkg['return_date'])
                return JsonResponse({"success": True, "data": packages})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
        finally:
            cursor.close()
            connection.close()
    
    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            
            # Travel and return date validation
            if 'travel_date' in data and data.get('travel_date') and 'return_date' in data and data.get('return_date'):
                try:
                    travel_dt = datetime.strptime(data['travel_date'], '%Y-%m-%d').date()
                    return_dt = datetime.strptime(data['return_date'], '%Y-%m-%d').date()
                    today = datetime.now().date()
                    if travel_dt < today:
                        return JsonResponse({"success": False, "error": "Travel date cannot be in the past"}, status=400)
                    if return_dt < travel_dt:
                        return JsonResponse({"success": False, "error": "Return date must be on or after travel date"}, status=400)
                except ValueError:
                    return JsonResponse({"success": False, "error": "Invalid date format. Use YYYY-MM-DD"}, status=400)

            connection = get_db_connection()
            cursor = connection.cursor()
            try:
                cursor.execute("""
                    INSERT INTO package_master (package_name, destination, days, nights, price, description, image_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (data['package_name'], data['destination'], int(data['days']), int(data['nights']), 
                      float(data['price']), data.get('description', ''), data.get('image_url', '')))
                new_package_id = cursor.lastrowid

                # Insert schedule automatically if bus_id and travel_date are sent
                if 'bus_id' in data and data.get('bus_id') and 'travel_date' in data and data.get('travel_date'):
                    cursor.execute("SELECT total_seats FROM bus_master WHERE bus_id=%s", (data['bus_id'],))
                    bus = cursor.fetchone()
                    available_seats = bus['total_seats'] if bus else 0
                    
                    cursor.execute("""
                        INSERT INTO schedule_master (package_id, bus_id, travel_date, return_date, available_seats)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (new_package_id, int(data['bus_id']), data['travel_date'], data['return_date'], available_seats))

                # Create package notification
                cursor.execute("""
                    INSERT INTO notification_master (title, message, notification_type, reference_id)
                    VALUES (%s, %s, %s, %s)
                """, ('Package Created', f"New package '{data['package_name']}' created successfully.", 'PACKAGE', new_package_id))

                connection.commit()
                return JsonResponse({"success": True, "message": "Package and schedule created successfully", "package_id": new_package_id})
            finally:
                cursor.close()
                connection.close()
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    
    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            
            # Travel and return date validation
            if 'travel_date' in data and data.get('travel_date') and 'return_date' in data and data.get('return_date'):
                try:
                    travel_dt = datetime.strptime(data['travel_date'], '%Y-%m-%d').date()
                    return_dt = datetime.strptime(data['return_date'], '%Y-%m-%d').date()
                    today = datetime.now().date()
                    if travel_dt < today:
                        return JsonResponse({"success": False, "error": "Travel date cannot be in the past"}, status=400)
                    if return_dt < travel_dt:
                        return JsonResponse({"success": False, "error": "Return date must be on or after travel date"}, status=400)
                except ValueError:
                    return JsonResponse({"success": False, "error": "Invalid date format. Use YYYY-MM-DD"}, status=400)

            connection = get_db_connection()
            cursor = connection.cursor()
            try:
                cursor.execute("""
                    UPDATE package_master 
                    SET package_name=%s, destination=%s, days=%s, nights=%s, price=%s, description=%s, image_url=%s
                    WHERE package_id=%s
                """, (data['package_name'], data['destination'], int(data['days']), int(data['nights']), 
                      float(data['price']), data.get('description', ''), data.get('image_url', ''), package_id))

                # Update or insert schedule automatically if bus_id and travel_date are sent
                if 'bus_id' in data and data.get('bus_id') and 'travel_date' in data and data.get('travel_date'):
                    cursor.execute("SELECT schedule_id FROM schedule_master WHERE package_id=%s", (package_id,))
                    existing_schedule = cursor.fetchone()
                    
                    cursor.execute("SELECT total_seats FROM bus_master WHERE bus_id=%s", (data['bus_id'],))
                    bus = cursor.fetchone()
                    total_seats = bus['total_seats'] if bus else 0
                    
                    if existing_schedule:
                        # Fetch the number of already booked seats for this schedule
                        cursor.execute("""
                            SELECT COUNT(*) as booked_seats FROM booking_seat bs
                            JOIN booking_master bm ON bs.booking_id = bm.booking_id
                            WHERE bm.schedule_id = %s AND bm.booking_status != 'CANCELLED'
                        """, (existing_schedule['schedule_id'],))
                        booked_seats = cursor.fetchone()['booked_seats']
                        available_seats = total_seats - booked_seats
                        
                        cursor.execute("""
                            UPDATE schedule_master 
                            SET bus_id=%s, travel_date=%s, return_date=%s, available_seats=%s
                            WHERE schedule_id=%s
                        """, (int(data['bus_id']), data['travel_date'], data['return_date'], available_seats, existing_schedule['schedule_id']))
                    else:
                        cursor.execute("""
                            INSERT INTO schedule_master (package_id, bus_id, travel_date, return_date, available_seats)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (package_id, int(data['bus_id']), data['travel_date'], data['return_date'], total_seats))

                # Create package update notification
                cursor.execute("""
                    INSERT INTO notification_master (title, message, notification_type, reference_id)
                    VALUES (%s, %s, %s, %s)
                """, ('Package Updated', f"Package '{data['package_name']}' updated successfully.", 'PACKAGE', package_id))

                connection.commit()
                return JsonResponse({"success": True, "message": "Package updated successfully"})
            finally:
                cursor.close()
                connection.close()
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    
    elif request.method == "DELETE":
        try:
            connection = get_db_connection()
            cursor = connection.cursor()
            try:
                cursor.execute("UPDATE package_master SET status='INACTIVE' WHERE package_id=%s", (package_id,))
                
                # Create package delete notification
                cursor.execute("""
                    INSERT INTO notification_master (title, message, notification_type, reference_id)
                    VALUES (%s, %s, %s, %s)
                """, ('Package Deleted', f"Package ID {package_id} marked as INACTIVE.", 'PACKAGE', package_id))
                
                connection.commit()
                return JsonResponse({"success": True, "message": "Package deleted successfully"})
            finally:
                cursor.close()
                connection.close()
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

# ==================== SCHEDULE APIS ====================
@csrf_exempt
@require_http_methods(["GET", "POST"])
def schedules(request, package_id=None):
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        if request.method == "GET":
            schedule_id = request.GET.get('schedule_id')
            if schedule_id:
                cursor.execute("""
                    SELECT s.*, b.bus_name, b.bus_number, b.total_seats, p.package_name, p.price, p.destination,
                           (SELECT COUNT(*) FROM booking_seat bs
                            JOIN booking_master bk ON bs.booking_id = bk.booking_id
                            WHERE bk.schedule_id = s.schedule_id AND bk.booking_status != 'CANCELLED') as booked_seats
                    FROM schedule_master s
                    JOIN bus_master b ON s.bus_id = b.bus_id
                    JOIN package_master p ON s.package_id = p.package_id
                    WHERE s.schedule_id = %s
                """, (schedule_id,))
                schedules = cursor.fetchall()
                if schedules and schedules[0].get('price'):
                    schedules[0]['price'] = float(schedules[0]['price'])
                return JsonResponse({"success": True, "data": schedules})
            elif package_id:
                cursor.execute("""
                    SELECT s.*, b.bus_name, b.bus_number, b.total_seats,
                           (SELECT COUNT(*) FROM booking_seat bs
                            JOIN booking_master bk ON bs.booking_id = bk.booking_id
                            WHERE bk.schedule_id = s.schedule_id AND bk.booking_status != 'CANCELLED') as booked_seats
                    FROM schedule_master s
                    JOIN bus_master b ON s.bus_id = b.bus_id
                    WHERE s.package_id = %s AND s.travel_date >= CURDATE()
                    ORDER BY s.travel_date ASC
                """, (package_id,))
                schedules = cursor.fetchall()
                return JsonResponse({"success": True, "data": schedules})
            else:
                cursor.execute("""
                    SELECT s.*, b.bus_name, b.bus_number, b.total_seats, p.package_name,
                           (SELECT COUNT(*) FROM booking_seat bs
                            JOIN booking_master bk ON bs.booking_id = bk.booking_id
                            WHERE bk.schedule_id = s.schedule_id AND bk.booking_status != 'CANCELLED') as booked_seats
                    FROM schedule_master s
                    JOIN bus_master b ON s.bus_id = b.bus_id
                    JOIN package_master p ON s.package_id = p.package_id
                    WHERE s.travel_date >= CURDATE()
                    ORDER BY s.travel_date ASC
                    LIMIT 20
                """)
                schedules = cursor.fetchall()
                return JsonResponse({"success": True, "data": schedules})
        
        elif request.method == "POST":
            data = json.loads(request.body)
            cursor.execute("SELECT total_seats FROM bus_master WHERE bus_id=%s", (data['bus_id'],))
            bus = cursor.fetchone()
            available_seats = bus['total_seats'] if bus else 0
            
            cursor.execute("""
                INSERT INTO schedule_master (package_id, bus_id, travel_date, return_date, available_seats)
                VALUES (%s, %s, %s, %s, %s)
            """, (data['package_id'], data['bus_id'], data['travel_date'], data['return_date'], available_seats))
            new_schedule_id = cursor.lastrowid
            
            # Create schedule notification
            cursor.execute("""
                INSERT INTO notification_master (title, message, notification_type, reference_id)
                VALUES (%s, %s, %s, %s)
            """, ('Schedule Created', f"New travel schedule created for package ID {data['package_id']}.", 'SCHEDULE', new_schedule_id))
            
            connection.commit()
            return JsonResponse({"success": True, "message": "Schedule created successfully"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    finally:
        cursor.close()
        connection.close()

# ==================== BUS APIS ====================
@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def buses(request, bus_id=None):
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        if request.method == "GET":
            if bus_id:
                cursor.execute("SELECT * FROM bus_master WHERE bus_id=%s AND status='ACTIVE'", (bus_id,))
                bus = cursor.fetchone()
                return JsonResponse({"success": True, "data": bus})
            else:
                cursor.execute("SELECT * FROM bus_master WHERE status='ACTIVE' ORDER BY created_at DESC")
                buses = cursor.fetchall()
                return JsonResponse({"success": True, "data": buses})
        
        elif request.method == "POST":
            data = json.loads(request.body)
            cursor.execute("""
                INSERT INTO bus_master (bus_name, bus_number, total_seats, bus_type, driver_name, driver_mobile)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (data['bus_name'], data['bus_number'], int(data['total_seats']), 
                  data['bus_type'], data.get('driver_name', ''), data.get('driver_mobile', '')))
            
            new_bus_id = cursor.lastrowid
            sync_bus_seats(cursor, new_bus_id)
            
            # Create bus notification
            cursor.execute("""
                INSERT INTO notification_master (title, message, notification_type, reference_id)
                VALUES (%s, %s, %s, %s)
            """, ('Bus Created', f"New bus '{data['bus_name']}' (No: {data['bus_number']}) registered.", 'BUS', new_bus_id))
            
            connection.commit()
            return JsonResponse({"success": True, "message": "Bus created successfully", "bus_id": new_bus_id})
        
        elif request.method == "PUT":
            data = json.loads(request.body)
            cursor.execute("""
                UPDATE bus_master 
                SET bus_name=%s, bus_number=%s, total_seats=%s, bus_type=%s, driver_name=%s, driver_mobile=%s
                WHERE bus_id=%s
            """, (data['bus_name'], data['bus_number'], int(data['total_seats']), 
                  data['bus_type'], data.get('driver_name', ''), data.get('driver_mobile', ''), bus_id))
            sync_bus_seats(cursor, bus_id)
            
            # Create bus notification
            cursor.execute("""
                INSERT INTO notification_master (title, message, notification_type, reference_id)
                VALUES (%s, %s, %s, %s)
            """, ('Bus Updated', f"Bus '{data['bus_name']}' (No: {data['bus_number']}) updated.", 'BUS', bus_id))
            
            connection.commit()
            return JsonResponse({"success": True, "message": "Bus updated successfully"})
        
        elif request.method == "DELETE":
            cursor.execute("UPDATE bus_master SET status='INACTIVE' WHERE bus_id=%s", (bus_id,))
            
            # Create bus notification
            cursor.execute("""
                INSERT INTO notification_master (title, message, notification_type, reference_id)
                VALUES (%s, %s, %s, %s)
            """, ('Bus Deleted', f"Bus ID {bus_id} marked as INACTIVE.", 'BUS', bus_id))
            
            connection.commit()
            return JsonResponse({"success": True, "message": "Bus deleted successfully"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    finally:
        cursor.close()
        connection.close()

# ==================== SEAT APIS ====================
@csrf_exempt
@require_http_methods(["GET"])
def seats(request, schedule_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        # Get bus_id to sync seats first
        cursor.execute("SELECT bus_id FROM schedule_master WHERE schedule_id = %s", (schedule_id,))
        schedule_info = cursor.fetchone()
        if schedule_info:
            sync_bus_seats(cursor, schedule_info['bus_id'])
            connection.commit()

        cursor.execute("""
            SELECT s.seat_id, s.seat_no, s.seat_type, s.status,
                   (SELECT COUNT(*) FROM booking_seat bs
                    JOIN booking_master bm ON bs.booking_id = bm.booking_id
                    WHERE bs.seat_id = s.seat_id AND bm.schedule_id = sm.schedule_id AND bm.booking_status != 'CANCELLED') as is_booked
            FROM seat_master s
            JOIN schedule_master sm ON s.bus_id = sm.bus_id
            WHERE sm.schedule_id = %s
            ORDER BY CAST(s.seat_no AS UNSIGNED)
        """, (schedule_id,))
        seats = cursor.fetchall()
        return JsonResponse({"success": True, "data": seats})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    finally:
        cursor.close()
        connection.close()

# ==================== BOOKING APIS ====================
@csrf_exempt
@require_http_methods(["GET", "POST", "PUT"])
def bookings(request, booking_id=None):
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        if request.method == "GET":
            if booking_id:
                cursor.execute("""
                    SELECT b.*, c.customer_name, c.mobile, c.email, p.package_name, p.destination, p.price,
                           sm.travel_date, sm.return_date, bm.bus_name, bm.bus_number,
                           (SELECT SUM(amount) FROM payment_master WHERE booking_id = b.booking_id AND payment_status='SUCCESS') as paid_amount
                    FROM booking_master b
                    JOIN customer_master c ON b.customer_id = c.customer_id
                    JOIN package_master p ON b.package_id = p.package_id
                    JOIN schedule_master sm ON b.schedule_id = sm.schedule_id
                    JOIN bus_master bm ON sm.bus_id = bm.bus_id
                    WHERE b.booking_id = %s
                """, (booking_id,))
                booking = cursor.fetchone()
                if booking:
                    if booking.get('total_amount'):
                        booking['total_amount'] = float(booking['total_amount'])
                    if booking.get('advance_amount'):
                        booking['advance_amount'] = float(booking['advance_amount'])
                    if booking.get('price'):
                        booking['price'] = float(booking['price'])
                    
                    # Ensure columns exist on booking_seat
                    try:
                        cursor.execute("ALTER TABLE booking_seat ADD COLUMN passenger_name VARCHAR(255) NULL")
                    except Exception:
                        pass
                    try:
                        cursor.execute("ALTER TABLE booking_seat ADD COLUMN ticket_type VARCHAR(50) DEFAULT 'FULL'")
                    except Exception:
                        pass

                    # Fetch passenger seats details
                    cursor.execute("""
                        SELECT bs.seat_id, bs.passenger_name, bs.ticket_type, s.seat_no
                        FROM booking_seat bs
                        JOIN seat_master s ON bs.seat_id = s.seat_id
                        WHERE bs.booking_id = %s
                    """, (booking_id,))
                    booking['passengers'] = cursor.fetchall()

                return JsonResponse({"success": True, "data": booking})
            else:
                mobile = request.GET.get('mobile')
                if mobile:
                    cursor.execute("""
                        SELECT b.*, c.customer_name, c.mobile, p.package_name, sm.travel_date,
                               bm.bus_name, bm.bus_number
                        FROM booking_master b
                        JOIN customer_master c ON b.customer_id = c.customer_id
                        JOIN package_master p ON b.package_id = p.package_id
                        JOIN schedule_master sm ON b.schedule_id = sm.schedule_id
                        JOIN bus_master bm ON sm.bus_id = bm.bus_id
                        WHERE c.mobile = %s
                        ORDER BY b.booking_date DESC
                    """, (mobile,))
                else:
                    cursor.execute("""
                        SELECT b.*, c.customer_name, c.mobile, p.package_name, sm.travel_date,
                               bm.bus_name, bm.bus_number
                        FROM booking_master b
                        JOIN customer_master c ON b.customer_id = c.customer_id
                        JOIN package_master p ON b.package_id = p.package_id
                        JOIN schedule_master sm ON b.schedule_id = sm.schedule_id
                        JOIN bus_master bm ON sm.bus_id = bm.bus_id
                        ORDER BY b.booking_date DESC
                    """)
                bookings = cursor.fetchall()
                for booking in bookings:
                    if booking.get('total_amount'):
                        booking['total_amount'] = float(booking['total_amount'])
                    if booking.get('advance_amount'):
                        booking['advance_amount'] = float(booking['advance_amount'])
                    
                    # Fetch passenger seats details
                    cursor.execute("""
                        SELECT bs.seat_id, bs.passenger_name, bs.ticket_type, s.seat_no
                        FROM booking_seat bs
                        JOIN seat_master s ON bs.seat_id = s.seat_id
                        WHERE bs.booking_id = %s
                    """, (booking['booking_id'],))
                    booking['passengers'] = cursor.fetchall()

                return JsonResponse({"success": True, "data": bookings})
        
        elif request.method == "POST":
            data = json.loads(request.body)
            booking_no = f"BK{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
            
            # Ensure columns exist on booking_seat
            try:
                cursor.execute("ALTER TABLE booking_seat ADD COLUMN passenger_name VARCHAR(255) NULL")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE booking_seat ADD COLUMN ticket_type VARCHAR(50) DEFAULT 'FULL'")
            except Exception:
                pass

            # Check if customer exists
            cursor.execute("SELECT customer_id FROM customer_master WHERE mobile=%s", (data['mobile'],))
            customer = cursor.fetchone()
            
            if customer:
                customer_id = customer['customer_id']
            else:
                cursor.execute("""
                    INSERT INTO customer_master (customer_name, mobile, email, city, address)
                    VALUES (%s, %s, %s, %s, %s)
                """, (data['customer_name'], data['mobile'], data.get('email', ''), 
                      data.get('city', ''), data.get('address', '')))
                customer_id = cursor.lastrowid
            
            # Create booking
            cursor.execute("""
                INSERT INTO booking_master (booking_no, customer_id, package_id, schedule_id, 
                                            total_amount, advance_amount, balance_amount, booking_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'CONFIRMED')
            """, (booking_no, customer_id, data['package_id'], data['schedule_id'],
                  float(data['total_amount']), float(data['advance_amount']), float(data['balance_amount'])))
            new_booking_id = cursor.lastrowid
            
            # Book seats & passengers
            passengers_list = data.get('passengers', [])
            if passengers_list:
                for passenger in passengers_list:
                    cursor.execute("""
                        INSERT INTO booking_seat (booking_id, seat_id, passenger_name, ticket_type)
                        VALUES (%s, %s, %s, %s)
                    """, (new_booking_id, passenger['seat_id'], passenger.get('name', ''), passenger.get('type', 'FULL')))
            else:
                for seat_id in data['selected_seats']:
                    cursor.execute("""
                        INSERT INTO booking_seat (booking_id, seat_id, passenger_name, ticket_type)
                        VALUES (%s, %s, %s, %s)
                    """, (new_booking_id, seat_id, '', 'FULL'))
            
            # Update schedule available seats
            cursor.execute("""
                UPDATE schedule_master 
                SET available_seats = available_seats - %s
                WHERE schedule_id = %s
            """, (len(data['selected_seats']), data['schedule_id']))
            
            # Create payment record
            cursor.execute("""
                INSERT INTO payment_master (booking_id, amount, payment_mode, transaction_id, payment_status)
                VALUES (%s, %s, %s, %s, 'SUCCESS')
            """, (new_booking_id, float(data['advance_amount']), data['payment_mode'], 
                  f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{new_booking_id}"))
            
            # Fetch package name for notification log
            cursor.execute("SELECT package_name FROM package_master WHERE package_id = %s", (data['package_id'],))
            pkg_res = cursor.fetchone()
            pkg_name = pkg_res['package_name'] if pkg_res else "Unknown Package"

            num_people = len(data.get('passengers', [])) or len(data.get('selected_seats', [])) or 1
            notif_msg = (
                f"New booking confirmed: {booking_no} for package '{pkg_name}'.\n"
                f"Customer: {data['customer_name']} | Mobile: {data['mobile']} | Email: {data.get('email', 'N/A')}\n"
                f"City: {data.get('city', 'N/A')} | Address: {data.get('address', 'N/A')}\n"
                f"Seats booked: {num_people} person(s)."
            )

            # Create notification
            cursor.execute("""
                INSERT INTO notification_master (title, message, notification_type, reference_id)
                VALUES (%s, %s, %s, %s)
            """, ('New Booking', notif_msg, 'BOOKING', new_booking_id))
            
            connection.commit()
            
            return JsonResponse({"success": True, "message": "Booking created successfully", 
                               "booking_id": new_booking_id, "booking_no": booking_no})
        
        elif request.method == "PUT" and booking_id:
            data = json.loads(request.body)
            if data.get('action') == 'confirm':
                cursor.execute("""
                    UPDATE booking_master 
                    SET booking_status='CONFIRMED'
                    WHERE booking_id=%s
                """, (booking_id,))
                
                cursor.execute("""
                    INSERT INTO notification_master (title, message, notification_type, reference_id)
                    VALUES (%s, %s, %s, %s)
                """, ('Booking Confirmed', f'Your booking {booking_id} has been confirmed', 'BOOKING', booking_id))
                
            elif data.get('action') == 'cancel':
                cursor.execute("""
                    UPDATE booking_master 
                    SET booking_status='CANCELLED', cancel_reason=%s, cancelled_at=NOW()
                    WHERE booking_id=%s
                """, (data.get('cancel_reason', ''), booking_id))
                
                # Update schedule available seats
                cursor.execute("""
                    UPDATE schedule_master sm
                    SET available_seats = available_seats + (
                         SELECT COUNT(*) FROM booking_seat bs WHERE bs.booking_id = %s
                    )
                    WHERE schedule_id = (SELECT schedule_id FROM booking_master WHERE booking_id = %s)
                """, (booking_id, booking_id))
                
                # Fetch booking_no for notification log
                cursor.execute("SELECT booking_no FROM booking_master WHERE booking_id = %s", (booking_id,))
                b_res = cursor.fetchone()
                b_no = b_res['booking_no'] if b_res else str(booking_id)

                cursor.execute("""
                    INSERT INTO notification_master (title, message, notification_type, reference_id)
                    VALUES (%s, %s, %s, %s)
                """, ('Booking Cancelled', f'Booking {b_no} has been cancelled by the customer. No refund processed.', 'BOOKING', booking_id))
            
            connection.commit()
            return JsonResponse({"success": True, "message": "Booking updated successfully"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    finally:
        cursor.close()
        connection.close()

# ==================== DASHBOARD APIS ====================
@csrf_exempt
@require_http_methods(["GET"])
def dashboard_stats(request):
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        cursor.execute("SELECT COUNT(*) as total_bookings FROM booking_master")
        total_bookings = cursor.fetchone()['total_bookings']
        
        cursor.execute("SELECT COUNT(*) as pending_bookings FROM booking_master WHERE booking_status='PENDING'")
        pending_bookings = cursor.fetchone()['pending_bookings']
        
        cursor.execute("SELECT COUNT(*) as confirmed_bookings FROM booking_master WHERE booking_status='CONFIRMED'")
        confirmed_bookings = cursor.fetchone()['confirmed_bookings']
        
        cursor.execute("SELECT COUNT(*) as cancelled_bookings FROM booking_master WHERE booking_status='CANCELLED'")
        cancelled_bookings = cursor.fetchone()['cancelled_bookings']
        
        cursor.execute("SELECT SUM(advance_amount) as total_revenue FROM booking_master WHERE booking_status IN ('PENDING', 'CONFIRMED')")
        result = cursor.fetchone()
        total_revenue = result['total_revenue'] if result['total_revenue'] else 0
        
        cursor.execute("SELECT COUNT(*) as available_packages FROM package_master WHERE status='ACTIVE'")
        available_packages = cursor.fetchone()['available_packages']
        
        cursor.execute("""
            SELECT b.booking_id, b.booking_no, c.customer_name, p.package_name, 
                   b.total_amount, b.booking_status, b.booking_date
            FROM booking_master b
            JOIN customer_master c ON b.customer_id = c.customer_id
            JOIN package_master p ON b.package_id = p.package_id
            ORDER BY b.booking_date DESC
            LIMIT 10
        """)
        recent_bookings = cursor.fetchall()
        for booking in recent_bookings:
            if booking.get('total_amount'):
                booking['total_amount'] = float(booking['total_amount'])
        
        return JsonResponse({
            "success": True,
            "data": {
                "total_bookings": total_bookings,
                "pending_bookings": pending_bookings,
                "confirmed_bookings": confirmed_bookings,
                "cancelled_bookings": cancelled_bookings,
                "total_revenue": float(total_revenue),
                "available_packages": available_packages,
                "recent_bookings": recent_bookings
            }
        })
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    finally:
        cursor.close()
        connection.close()

# ==================== LANGUAGE APIS ===================
@csrf_exempt
@require_http_methods(["GET"])
def languages(request):
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        cursor.execute("SELECT * FROM language_master")
        languages = cursor.fetchall()
        return JsonResponse({"success": True, "data": languages})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    finally:
        cursor.close()
        connection.close()

# ==================== TRANSLATIONS ====================
@csrf_exempt
@require_http_methods(["GET"])
def translations(request, lang_code):
    translations_data = {
        'en': {
            'welcome': 'Welcome to Madhavan Tourism',
            'search_destination': 'Search Destination',
            'book_now': 'Book Now',
            'popular_packages': 'Popular Packages',
            'contact_us': 'Contact Us',
            'about_us': 'About Us',
            'home': 'Home',
            'packages': 'Packages',
            'my_bookings': 'My Bookings',
            'admin_login': 'Admin Login',
            'view_details': 'View Details',
            'book_tour': 'Book Tour',
            'select_seats': 'Select Seats',
            'customer_details': 'Customer Details',
            'payment': 'Payment',
            'confirm_booking': 'Confirm Booking'
        },
        'hi': {
            'welcome': 'माधवन टूरिज्म में आपका स्वागत है',
            'search_destination': 'गंतव्य खोजें',
            'book_now': 'अभी बुक करें',
            'popular_packages': 'लोकप्रिय पैकेज',
            'contact_us': 'संपर्क करें',
            'about_us': 'हमारे बारे में',
            'home': 'होम',
            'packages': 'पैकेज',
            'my_bookings': 'माई बुकिंग्स',
            'admin_login': 'एडमिन लॉगिन',
            'view_details': 'विवरण देखें',
            'book_tour': 'टूर बुक करें',
            'select_seats': 'सीट चुनें',
            'customer_details': 'ग्राहक विवरण',
            'payment': 'भुगतान',
            'confirm_booking': 'बुकिंग पुष्टि करें'
        },
        'gu': {
            'welcome': 'માધવન ટુરિઝમ માં આપનું સ્વાગત છે',
            'search_destination': 'ગંતવ્ય શોધો',
            'book_now': 'હમણાં બુક કરો',
            'popular_packages': 'લોકપ્રિય પેકેજો',
            'contact_us': 'સંપર્ક કરો',
            'about_us': 'અમારા વિશે',
            'home': 'હોમ',
            'packages': 'પેકેજો',
            'my_bookings': 'મારી બુકિંગ્સ',
            'admin_login': 'એડમિન લોગિન',
            'view_details': 'વિગતો જુઓ',
            'book_tour': 'ટૂર બુક કરો',
            'select_seats': 'સીટ પસંદ કરો',
            'customer_details': 'ગ્રાહક વિગતો',
            'payment': 'ચુકવણી',
            'confirm_booking': 'બુકિંગની પુષ્ટિ કરો'
        }
    }
    return JsonResponse({"success": True, "data": translations_data.get(lang_code, translations_data['en'])})

@csrf_exempt
@require_http_methods(["GET"])
def download_ticket_pdf(request, booking_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        # Fetch detailed booking information
        cursor.execute("""
            SELECT b.booking_no, b.total_amount, b.booking_status, b.booking_date,
                   c.customer_name, c.email, c.mobile,
                   p.package_name, p.destination, p.price, p.days, p.nights,
                   s.travel_date, s.return_date,
                   bus.bus_name, bus.bus_number
            FROM booking_master b
            JOIN customer_master c ON b.customer_id = c.customer_id
            JOIN package_master p ON b.package_id = p.package_id
            JOIN schedule_master s ON b.schedule_id = s.schedule_id
            JOIN bus_master bus ON s.bus_id = bus.bus_id
            WHERE b.booking_id = %s
        """, (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            return HttpResponse("Ticket not found", status=404)
            
        # Fetch passengers details
        cursor.execute("""
            SELECT bs.passenger_name, bs.ticket_type, s.seat_no
            FROM booking_seat bs
            JOIN seat_master s ON bs.seat_id = s.seat_id
            WHERE bs.booking_id = %s
        """, (booking_id,))
        passengers = cursor.fetchall()
        
        # Create PDF response
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Ticket_{booking["booking_no"]}.pdf"'
        
        # Initialize ReportLab canvas
        p = canvas.Canvas(response, pagesize=letter)
        width, height = letter
        
        # --- Draw Ticket Design ---
        # Draw header border / background
        p.setFillColor(HexColor('#1E293B')) # Slate-800
        p.rect(0, height - 120, width, 120, stroke=0, fill=1)
        
        # Header text
        p.setFillColor(HexColor('#F97316')) # Primary Orange
        p.setFont("Helvetica-Bold", 26)
        p.drawString(40, height - 60, "MADHAVAN TOURISM")
        
        p.setFillColor(HexColor('#FFFFFF'))
        p.setFont("Helvetica", 12)
        p.drawString(40, height - 85, "Your Trusted Travel Partner  |  madhvantourism@gmail.com")
        
        p.drawRightString(width - 40, height - 60, "E-TICKET / RECEIPT")
        p.setFont("Helvetica-Bold", 10)
        p.drawRightString(width - 40, height - 85, f"Booking No: {booking['booking_no']}")
        
        # Body content starting y-coordinate
        y = height - 160
        
        # Section: Tour details
        p.setFillColor(HexColor('#1E293B'))
        p.setFont("Helvetica-Bold", 16)
        p.drawString(40, y, "Tour Information")
        y -= 25
        
        p.setFont("Helvetica", 11)
        p.setFillColor(HexColor('#334155'))
        p.drawString(40, y, f"Package Name: {booking['package_name']}")
        p.drawString(300, y, f"Destination: {booking['destination']}")
        y -= 20
        p.drawString(40, y, f"Duration: {booking['days']} Days / {booking['nights']} Nights")
        p.drawString(300, y, f"Bus Assigned: {booking['bus_name']} ({booking['bus_number']})")
        y -= 20
        p.drawString(40, y, f"Travel Date: {booking['travel_date']}")
        p.drawString(300, y, f"Return Date: {booking['return_date']}")
        y -= 30
        
        # Draw a separator line
        p.setStrokeColor(HexColor('#E2E8F0'))
        p.setLineWidth(1)
        p.line(40, y, width - 40, y)
        y -= 20
        
        # Section: Customer details
        p.setFillColor(HexColor('#1E293B'))
        p.setFont("Helvetica-Bold", 16)
        p.drawString(40, y, "Customer Details")
        y -= 25
        
        p.setFont("Helvetica", 11)
        p.setFillColor(HexColor('#334155'))
        p.drawString(40, y, f"Primary Traveler: {booking['customer_name']}")
        p.drawString(300, y, f"Registered Mobile: {booking['mobile']}")
        y -= 20
        p.drawString(40, y, f"Registered Email: {booking['email']}")
        y -= 30
        
        # Draw a separator line
        p.line(40, y, width - 40, y)
        y -= 20
        
        # Section: Passengers list
        p.setFillColor(HexColor('#1E293B'))
        p.setFont("Helvetica-Bold", 16)
        p.drawString(40, y, "Passengers / Seat Allocations")
        y -= 25
        
        # Draw table headers
        p.setFillColor(HexColor('#F1F5F9'))
        p.rect(40, y - 5, width - 80, 20, stroke=0, fill=1)
        p.setFillColor(HexColor('#475569'))
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, y, "Passenger Name")
        p.drawString(250, y, "Seat No")
        p.drawString(400, y, "Ticket Type")
        y -= 20
        
        # Draw passenger rows
        p.setFont("Helvetica", 10)
        p.setFillColor(HexColor('#334155'))
        for idx, psg in enumerate(passengers):
            p.drawString(50, y, psg['passenger_name'] or 'N/A')
            p.drawString(250, y, f"Seat {psg['seat_no']}")
            p.drawString(400, y, psg['ticket_type'] or 'FULL')
            y -= 20
            # Check for page boundary
            if y < 80:
                p.showPage()
                y = height - 50
                p.setFont("Helvetica", 10)
                p.setFillColor(HexColor('#334155'))
                
        y -= 10
        p.setStrokeColor(HexColor('#E2E8F0'))
        p.line(40, y, width - 40, y)
        y -= 25
        
        # Section: Price and Status
        p.setFillColor(HexColor('#1E293B'))
        p.setFont("Helvetica-Bold", 14)
        p.drawString(40, y, "Payment Details")
        y -= 25
        
        p.setFont("Helvetica", 11)
        p.setFillColor(HexColor('#334155'))
        p.drawString(40, y, f"Booking Status: {booking['booking_status']}")
        p.drawString(300, y, f"Total Paid: INR {booking['total_amount']}")
        
        y -= 60
        # Draw footer/terms
        p.setFillColor(HexColor('#94A3B8'))
        p.setFont("Helvetica-Oblique", 9)
        p.drawCentredString(width / 2.0, y, "Please arrive at the boarding location 15 minutes before the departure time.")
        p.drawCentredString(width / 2.0, y - 15, "Thank you for traveling with Madhavan Tourism!")
        
        # Finalize and close PDF page
        p.showPage()
        p.save()
        return response
    except Exception as e:
        return HttpResponse(f"Error generating ticket PDF: {e}", status=500)
    finally:
        cursor.close()
        connection.close()

# ==================== BROCHURE UPLOAD ====================
@csrf_exempt
@require_http_methods(["POST"])
def upload_brochure(request, package_id):
    if request.method == "POST":
        try:
            brochure_file = request.FILES.get('brochure')
            if brochure_file:
                file_path = f"/media/brochures/package_{package_id}_{brochure_file.name}"
                
                connection = get_db_connection()
                cursor = connection.cursor()
                try:
                    # Add brochure_path column if not exists
                    try:
                        cursor.execute("""
                            ALTER TABLE package_master 
                            ADD COLUMN brochure_path TEXT NULL
                        """)
                    except:
                        pass
                    
                    cursor.execute("""
                        UPDATE package_master 
                        
                        SET brochure_path = %s
                        WHERE package_id = %s
                    """, (file_path, package_id))
                    connection.commit()
                finally:
                    cursor.close()
                    connection.close()
                
                # Create brochure upload notification
                cursor.execute("""
                    INSERT INTO notification_master (title, message, notification_type, reference_id)
                    VALUES (%s, %s, %s, %s)
                """, ('Brochure Uploaded', f"Brochure uploaded for package ID {package_id}.", 'PACKAGE', package_id))
                connection.commit()

                return JsonResponse({"success": True, "message": "Brochure uploaded successfully", "path": file_path})
            else:
                return JsonResponse({"success": False, "error": "No file provided"}, status=400)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET", "PUT"])
def notifications(request):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        if request.method == "GET":
            cursor.execute("SELECT * FROM notification_master ORDER BY created_at DESC LIMIT 50")
            notifs = cursor.fetchall()
            return JsonResponse({"success": True, "data": notifs})
        elif request.method == "PUT":
            data = json.loads(request.body)
            notification_id = data.get('notification_id')
            mark_all = data.get('mark_all', False)
            if mark_all:
                cursor.execute("UPDATE notification_master SET is_read = 1 WHERE is_read = 0")
            elif notification_id:
                cursor.execute("UPDATE notification_master SET is_read = 1 WHERE notification_id = %s", (notification_id,))
            connection.commit()
            return JsonResponse({"success": True, "message": "Notification(s) marked as read"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)
    finally:
        cursor.close()
        connection.close()