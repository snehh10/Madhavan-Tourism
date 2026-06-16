from django.urls import path
from views import views

urlpatterns = [
    # Package URLs
    path('packages/', views.packages),
    path('packages/<int:package_id>/', views.packages),
    
    # Schedule URLs
    path('packages/<int:package_id>/schedules/', views.schedules),
    path('schedules/', views.schedules),
    
    # Bus URLs
    path('buses/', views.buses),
    path('buses/<int:bus_id>/', views.buses),
    
    # Seat URLs
    path('schedules/<int:schedule_id>/seats/', views.seats),
    
    # Booking URLs
    path('bookings/', views.bookings),
    path('bookings/<int:booking_id>/', views.bookings),
    path('bookings/<int:booking_id>/ticket/', views.download_ticket_pdf),
    
    # Dashboard
    path('dashboard/stats/', views.dashboard_stats),
    
    # Language URLs
    path('languages/', views.languages),
    path('translations/<str:lang_code>/', views.translations),
    
    # Brochure Upload
    path('packages/<int:package_id>/upload-brochure/', views.upload_brochure),
    
    # Admin Authentication (ONLY THIS IS CHANGED - Fixed login)
    path('admin/login/', views.admin_login),
    path('admin/logout/', views.admin_logout),
    
    # Notifications endpoint
    path('notifications/', views.notifications),
]