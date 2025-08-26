'use client'
import React, { useEffect, useState, useCallback } from 'react'
import Image from 'next/image';
import Link from 'next/link';
import { CircleUser, LogOut, User, MessageSquare, Key, Menu, X, Search, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ThemeToggle from '../Theme/ThemeToggle';
import { useDispatch, useSelector } from 'react-redux';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/store/auth-slice';
import { persistor } from '@/store/store';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getUserDetails } from '@/store/user-slice';
import useUserId from '@/hooks/useUserId';
import { searchPdf } from '@/store/pdf-slice';

const Navbar = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { userData } = useSelector((state) => state.userprofile);
  const { user } = useSelector((state) => state.auth);
  const userId = useUserId()


  const handleLogout = async () => {
    dispatch(logout());
    await persistor.purge();
    router.replace('/auth/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.length >= 3) {
        setIsSearching(true);
        dispatch(searchPdf({ keyword: query, authToken: user?.token }))
          .then((result) => {
            setSearchResults(result?.payload || []);
            setShowSearchResults(true);
          })
          .finally(() => {
            setIsSearching(false);
          });
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300),
    [user?.token]
  );


  // Debounce utility function
  function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    const trimmedValue = value.trim(); // remove leading/trailing spaces

    if (value.length >= 3) {
      debouncedSearch(trimmedValue);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && searchQuery.length >= 3) {
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setIsSearching(false);
  };

  const handleSearchResultClick = (result) => {
    // Handle clicking on a search result
    setShowSearchResults(false);
    // Navigate to the selected result or perform action
    // router.push(`/pdf/view/${result.id}`);
  };

  // Hide search results when clicking outside
  const handleSearchBlur = () => {
    // Delay hiding to allow clicks on search results
    setTimeout(() => {
      setIsSearchFocused(false);
      setShowSearchResults(false);
    }, 200);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  useEffect(() => {
    dispatch(getUserDetails(userId));
  }, [dispatch])

  const SearchResults = ({ results, isVisible, onResultClick, isSearching, isMobile = false }) => {
    if (!isVisible) return null;

    return (
      <div
        className={`${isMobile
          ? 'h-full overflow-y-auto' // mobile full screen
          : 'max-h-96 overflow-y-auto absolute top-full left-0 right-0 mt-1'
          } bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50`}
      >
        {isSearching ? (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          </div>
        ) : results?.length === 0 ? (
          <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
            No results
          </div>
        ) : (
          results?.map((result, index) => (
            <div
              key={result.pdf_uploaded_id || index}
              onClick={() => onResultClick(result)}
              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {result?.article}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {result?.author}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };



  return (
    <nav className="flex justify-between items-center px-3 md:px-10 lg:px-10 py-3 shadow-md bg-white dark:bg-gray-800 dark:text-white relative">
      <Link href={'/pdf/pdflist'}>
      {/* light mode logo */}
        <Image
          src="/images/scholarly-logo-latest.png"
          width={140}
          height={40}
          alt="Scholarly Logo"
          className="w-24 h-10 md:w-36 md:h-14 dark:hidden"
        />
        {/* dark mode logo */}
        <Image
          src="/images/scholarly-logo.png"
          width={140}
          height={40}
          alt="Scholarly Logo"
          className="w-24 h-10 md:w-36 md:h-14 hidden dark:block"
        />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex gap-6 lg:gap-8 dark:text-gray-100 font-medium items-center justify-center flex-1 max-w-4xl">
        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-6 relative">
          <form onSubmit={handleSearch} className="relative">
            <div className={`relative flex items-center transition-all duration-200 w-full ${isSearchFocused
              ? 'ring-2 ring-blue-500 dark:ring-blue-400'
              : 'ring-1 ring-gray-300 dark:ring-gray-600'
              } rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800`}>
              <Search className="absolute left-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search Collections (min 3 characters)"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                className="w-full px-10 py-2 bg-transparent text-sm text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
              {isSearching ? (
                <Loader2 className="absolute right-3 h-4 w-4 text-blue-500 animate-spin" />
              ) : searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                </button>
              )}
            </div>
          </form>

          {/* Search Results Dropdown */}
          <SearchResults
            results={searchResults}
            isVisible={showSearchResults && isSearchFocused}
            onResultClick={handleSearchResultClick}
            isSearching={isSearching}
          />
        </div>

        {/* Navigation Links */}
        <div className="flex gap-6">
          <Link href={'/pdf/pdflist'} className={`cursor-pointer hover:text-gray-500 transition text-sm ${pathname === '/pdf/pdflist' ? 'text-blue-600 dark:text-blue-200' : 'text-gray-500 hover:text-blue-600'}`}>
            dashboard
          </Link>
          <Link href={'/pdf/manage-groups'} className={`cursor-pointer hover:text-gray-500 transition text-sm ${pathname === '/pdf/manage-groups' ? 'text-blue-600 dark:text-blue-200' : 'text-gray-500 hover:text-blue-600'}`}>
            manage groups
          </Link>
        </div>

        {/* Right side items */}
        <div className='flex flex-row gap-6 justify-center items-center'>
          <ThemeToggle />
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:text-white">
                  <User className="h-5 w-5"/>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 p-2 dark:bg-gray-900"
              align="end"
              forceMount
            >
              <div className="flex items-center space-x-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="p-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-full ">
                    {userData?.FirstName?.[0]?.toUpperCase()}{userData?.LastName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm text-gray-800 dark:text-gray-300 font-medium leading-none font-sans">{userData?.FirstName} {userData?.LastName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userData?.EmailID}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <Link href={'/user/add-profile'}>
                  <DropdownMenuItem className="flex flex-row gap-6 cursor-pointer text-gray-700 dark:text-gray-100 font-sans ">
                    <div className='p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full'>
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                <Link href={'/user/feedback'}>
                  <DropdownMenuItem className="flex flex-row gap-6 cursor-pointer text-gray-700 dark:text-gray-100 font-sans">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                      <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span>Feedback</span>
                  </DropdownMenuItem>
                </Link>
                <Link href={'/auth/reset-password'}>
                  <DropdownMenuItem className="flex flex-row gap-6 cursor-pointer text-gray-700 dark:text-gray-100 font-sans">
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
                      <Key className="h-4 w-4 text-yellow-600 dark:text-yellow-400"  />
                    </div>
                    <span>Change Password</span>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex flex-row gap-6 cursor-pointer text-red-600 focus:text-red-600 font-sans"
                onClick={handleLogout}
              >
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                  <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className='dark:text-red-400'>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center gap-3">
        <ThemeToggle />

        {/* User Profile Dropdown for Mobile */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:text-white">
                  <User className="h-5 w-5"/>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 p-2 dark:bg-gray-900"
              align="end"
              forceMount
            >
              <div className="flex items-center space-x-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="p-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-full ">
                    {userData?.FirstName?.[0]?.toUpperCase()}{userData?.LastName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm text-gray-800 dark:text-gray-300 font-medium leading-none font-sans">{userData?.FirstName} {userData?.LastName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userData?.EmailID}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <Link href={'/user/add-profile'}>
                  <DropdownMenuItem className="flex flex-row gap-6 cursor-pointer text-gray-700 dark:text-gray-100 font-sans ">
                    <div className='p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full'>
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                <Link href={'/user/feedback'}>
                  <DropdownMenuItem className="flex flex-row gap-6 cursor-pointer text-gray-700 dark:text-gray-100 font-sans">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                      <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span>Feedback</span>
                  </DropdownMenuItem>
                </Link>
                <Link href={'/auth/reset-password'}>
                  <DropdownMenuItem className="flex flex-row gap-6 cursor-pointer text-gray-700 dark:text-gray-100 font-sans">
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
                      <Key className="h-4 w-4 text-yellow-600 dark:text-yellow-400"  />
                    </div>
                    <span>Change Password</span>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex flex-row gap-6 cursor-pointer text-red-600 focus:text-red-600 font-sans"
                onClick={handleLogout}
              >
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                  <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className='dark:text-red-400'>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobileMenu}
          className="p-1.5 bg-gray-200 dark:bg-gray-800 transition-colors duration-200"
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <Menu
              className={`h-5 w-5 absolute transition-all duration-300 ${isMobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                }`}
            />
            <X
              className={`h-5 w-5 absolute transition-all duration-300 ${isMobileMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
                }`}
            />
          </div>
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`absolute top-full left-0 right-0 bg-white dark:bg-gray-900 shadow-lg border-t dark:border-gray-700 md:hidden z-50 overflow-auto transition-all duration-300 ease-in-out ${isMobileMenuOpen
          ? 'max-h-96 opacity-100'
          : 'max-h-0 opacity-0'
          }`}
      >
        <div className={`px-4 py-3 space-y-3 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-2'
          }`}>
          {/* Mobile Search Bar */}
          <div className="pb-3 border-b border-gray-200 dark:border-gray-700 relative">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative flex items-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Search className="absolute left-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search Collections (min 3 characters)"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  className="w-full pl-10 pr-10 py-2.5 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-lg"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 h-4 w-4 text-blue-500 animate-spin" />
                ) : searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                  </button>
                )}
              </div>
            </form>

            {/* Show search results in mobile */}
              <SearchResults
                results={searchResults}
                isVisible={showSearchResults && isSearchFocused}
                onResultClick={handleSearchResultClick}
                isSearching={isSearching}
                isMobile={true}
              />
          </div>

          <Link
            href={'/pdf/pdflist'}
            className={`block py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${pathname === '/pdf/pdflist'
              ? 'text-blue-600 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href={'/pdf/manage-groups'}
            className={`block py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${pathname === '/pdf/manage-groups'
              ? 'text-blue-600 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Manage Groups
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar